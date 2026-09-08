---
title: 基于MNIST分类网络的BNN硬件加速
date: 2026-09-06
aside: false
katex: true
description: 。
cover: /img/columns/bnn_mnist.jpg
tags:
  - BNN
  - Verilog
categories:
  - 数字 IC
---

项目实现了一个用于 MNIST 手写数字识别的二值神经网络（Binary Neural Network，BNN），并把它从 PyTorch 模型逐步转换成可综合的 Verilog 电路。项目本身没有任何实用价值，而是走通一条完整路径：神经网络训练、二值参数导出、整数参考模型、RTL 验证，以及资源优化。有点意思的可能就其中的数学原理和PE优化。

工程代码见: https://github.com/YangHong7/BNN_MNIST_

<!-- more -->

## 1. MNIST 分类神经网络

> 是的，依旧是CNN入门的那个网络，但是训练的时候我们使用BNN

### 1.1 网络结构

MNIST 图像大小为 $28\times28$。输入网络前，图像被拉平成一个长度为 784 的向量：

```text
28 × 28 灰度图像
        ↓ 展平并二值化
784 维输入
        ↓ BinaryLinear(784, 128) + BN + Sign
128 维二值激活
        ↓ BinaryLinear(128, 64) + BN + Sign
64 维二值激活
        ↓ BinaryLinear(64, 10)
10 个类别分数
        ↓ Argmax
预测数字 0～9
```

对应的网络结构为：

| 层 | 输入维度 | 输出维度 | 后处理 |
|---|---:|---:|---|
| 隐藏层1 | 784 | 128 | BatchNorm + Sign |
| 隐藏层2 | 128 | 64 | BatchNorm + Sign |
| 输出层 | 64 | 10 | Argmax |

### 1.2 功能

每个隐藏层都由三个步骤组成：

#### BinaryLinear

完成输入与权重的点积。以第一层为例，它包含128个神经元。每个神经元都接收同一张图像的784个输入，但拥有自己的一组784维权重，最终产生1个输出。因此第一层可以理解为同时计算128个点积：

$$
S_j=\sum_{i=0}^{783}a_iw_{j,i},\qquad j=0,1,\ldots,127
$$

其中 $a_i$ 是输入激活，$w_{j,i}$ 是第 $j$ 个神经元的权重。第二层重复相同过程，把128维输入转换成64维；输出层再计算10个分数，分别对应数字0到9。

#### BatchNorm

利用训练得到的均值、方差、缩放和偏移调整点积结果：

$$
y=\gamma\frac{S-\mu}{\sqrt{\mathrm{var}+\varepsilon}}+\beta
$$

这个公式对每个神经元分别计算，各参数含义如下：

| 符号 | 含义 | 是否参与梯度更新 |
|---|---|---|
| $S$ | `BinaryLinear` 输出的点积结果 | 不是BN参数 |
| $\mu$ | $S$ 的均值 | 批次统计量或累计统计量 |
| $\mathrm{var}$ | $S$ 的方差 | 批次统计量或累计统计量 |
| $\gamma$ | 可学习的缩放系数 | 是 |
| $\beta$ | 可学习的平移系数 | 是 |
| $\varepsilon$ | 防止除零的固定小量，默认 $10^{-5}$ | 否 |

其中 $\gamma$ 和 $\beta$ 与普通权重一样由优化器更新；均值和方差不是通过反向传播学习的，而是由每一批数据统计得到。训练和推理阶段具体使用哪一组均值、方差，将在3.2和3.3节说明。

#### Sign

结果大于等于0时输出 `+1`，否则输出 `-1`。

因此，隐藏层虽然会计算一个数值点积，但传给下一层的仍然是二值激活。

输出层没有BN和Sign，用Argmax选择最大分数对应的类别。


## 2. 核心数学原理

BNN可以把隐藏层简化成三步：

```text
二值乘法 → XNOR
有符号累加 → Popcount
BatchNorm + Sign → Threshold Compare
```

### 2.1 XNOR 代替二值乘法

对任意一对二值数 $a_i,w_i\in\{-1,+1\}$：

| $a_i$ | $w_i$ | $a_iw_i$ | 比特编码 | XNOR |
|---:|---:|---:|---|---:|
| +1 | +1 | +1 | 1, 1 | 1 |
| +1 | -1 | -1 | 1, 0 | 0 |
| -1 | +1 | -1 | 0, 1 | 0 |
| -1 | -1 | +1 | 0, 0 | 1 |

两者同号时乘积为 `+1`，XNOR也输出1；异号时乘积为 `-1`，XNOR输出0。因此一组二值乘法可以直接写成：

```verilog
xnor_bits = ~(activation ^ weight);
```

这里不再需要DSP乘法器，只需要逐位逻辑运算。

### 2.2 Popcount 还原点积

XNOR只告诉我们哪些位置同号，还需要把结果累加。假设输入长度为 $N$，XNOR结果中有 $P$ 个1：

- $P$ 个位置同号，对点积贡献 $+1$；
- $N-P$ 个位置异号，对点积贡献 $-1$。

因此原始点积为：

$$
S=P-(N-P)=2P-N
$$

这里的 $P$ 就是对XNOR结果进行Popcount得到的1的数量。

例如：

```text
activation : +1  -1  +1  +1  -1  -1  +1  +1
weight     : +1  +1  -1  +1  -1  +1  +1  +1
XNOR bits  :  1   0   0   1   1   0   1   1
```

共有 $P=5$ 个位置相同，$N=8$，所以：

$$
S=2\times5-8=2
$$

至此，“8次乘法加累加”就变成了“8位XNOR加一次Popcount”。

### 2.3 BN 和 Sign 折叠成整数阈值

Popcount可以恢复点积，但隐藏层后面还有BN和Sign。推理时BN为：

$$
y=\gamma\frac{S-\mu}{\sqrt{\mathrm{var}+\varepsilon}}+\beta
$$

Sign只关心 $y$ 是否大于等于0。令：

$$
\hat{\sigma}=\sqrt{\mathrm{var}+\varepsilon}
$$

由 $y\geq0$ 可以求出点积阈值：

$$
S_{thr}=\mu-\frac{\beta\hat{\sigma}}{\gamma}
$$

再代入 $S=2P-N$：

- 当 $\gamma>0$ 时，不等号方向不变：

$$
P\geq\left\lceil\frac{S_{thr}+N}{2}\right\rceil
$$

- 当 $\gamma<0$ 时，不等号方向反转：

$$
P\leq\left\lfloor\frac{S_{thr}+N}{2}\right\rfloor
$$

所以每个隐藏层神经元只需导出一个整数阈值 `T` 和一个方向位 `flip`：

```verilog
binary_out = flip ? (popcount_in <= threshold)
                  : (popcount_in >= threshold);
```

至此，一个隐藏层神经元的完整推理已经从：

```text
浮点/整数乘加 → BatchNorm → Sign
```

变成：

```text
XNOR → Popcount → 整数阈值比较
```

于是BNN网络完美适配数字电路。

### 2.4 输出层只需要 Argmax

> **Tips：** 输出层没有 BN 和 Sign。

第 $c$ 个类别的分数仍满足：

$$
S_c=2P_c-N
$$

因为10个类别的 $N$ 相同，乘2和减去相同常数不会改变大小顺序：

$$
\operatorname*{argmax}_c S_c
=\operatorname*{argmax}_c P_c
$$

因此硬件直接对10个Popcount取最大值即可，不需要Softmax，也不存在“负指数归一化”。

## 3. 网络训练和权重导出

### 3.1 构建网络

训练代码按照 `784 → 128 → 64 → 10` 构建三层网络。Linear层不使用bias，两个隐藏层各自连接BN和Sign，输出层直接输出10个logit。

输入图像先按 `pixel > 0.5` 二值化：

```python
x = (x > 0.5).float() * 2.0 - 1.0
```

得到的输入只有 `+1/-1`，与二值权重进行点积。

### 3.2 训练二值权重

Sign几乎处处不可导，因此训练时使用STE（Straight-Through Estimator）：

- 前向传播使用 `sign(w_real)`；
- 反向传播让梯度近似穿过Sign；
- 优化器更新浮点权重 `w_real`；
- 每次更新后把权重裁剪到 `[-1,1]`。

训练时实际上同时存在两种权重表示：

| 表示 | 取值 | 用途 |
|---|---|---|
| `w_real` | `[-1,1]` 内的浮点数 | 由Adam更新并保存在 `bnn_model.pth` 中 |
| `w_bin = sign(w_real)` | 只有 `+1/-1` | 真正参与前向点积 |

前向计算使用的权重确实始终是 `+1/-1`；“浮点权重”是它背后用于累计梯度的主权重，并不直接参与前向点积。

之所以保留 `w_real`，是因为二值权重无法记录小幅更新。例如一个权重当前为 `+1`，减去很小的梯度后若仍只能保存 `+1`，这次更新就完全丢失。浮点主权重可以逐步变化，跨过0时，其符号才从 `+1` 翻转为 `-1`。STE负责把二值前向路径上的梯度近似传回 `w_real`。

一次隐藏层前向传播可以更准确地写成：

```text
二值输入 (+1/-1)
  → 与 w_bin (+1/-1) 做 BinaryLinear
  → 得到点积 S
  → BN 输出临时浮点值 y
  → Sign 再变回 +1/-1
```

训练时BN使用当前mini-batch的均值 $\mu_B$ 和方差 $\mathrm{var}_B$ 完成本批归一化，同时维护用于部署的累计统计量。PyTorch默认 `momentum=0.1`，每处理一批就执行：

$$
\mathrm{running\_mean}_{new}
=0.9\,\mathrm{running\_mean}_{old}+0.1\,\mu_B
$$

$$
\mathrm{running\_var}_{new}
\approx0.9\,\mathrm{running\_var}_{old}+0.1\,\mathrm{var}_B
$$

这里的0.9和0.1是指数移动平均，不是“直接采用新统计量”：旧统计量保留90%，当前批次贡献10%，从而减小单个批次波动带来的影响。

当前训练配置为：

| 项目 | 配置 |
|---|---:|
| 数据集 | MNIST：60,000张训练图，10,000张测试图 |
| Epoch | 50 |
| Batch size | 128 |
| 优化器 | Adam |
| 初始学习率 | $3\times10^{-3}$ |
| 学习率策略 | Cosine Annealing |
| 损失函数 | CrossEntropyLoss |

训练过程中保存准确率最高的一轮参数，得到 `bnn_model.pth`。当前模型在完整10,000张测试集上的准确率为 **95.06%**。

> 当前脚本直接根据测试集准确率保存最佳模型。更严格的实验应从训练集划分验证集，只在最后使用一次测试集。

### 3.3 导出权重和阈值

训练阶段执行 `model.train()` 时，BN使用当前批次的 $\mu_B$ 和 $\mathrm{var}_B$，并按前面的 `0.9 × 旧值 + 0.1 × 当前值` 更新 `running_mean` 和 `running_var`。

导出和推理前执行 `model.eval()` 后，BN停止更新，也不再使用当前输入批次的统计量，而是固定使用训练结束时保存的：

```text
running_mean
running_var
```
`model.eval()` 不会重新计算统计量，也不会把BN变成整数；它只是把BN从“使用当前批次统计量”切换为“使用训练阶段累计统计量”。导出脚本再读取这些固定的 `running_mean`、`running_var` 以及 $\gamma$、$\beta$，计算每个神经元的整数阈值。

随后完成三件事：

1. 对三层浮点主权重 `w_real` 取Sign，得到真正部署的 `+1/-1` 权重，再编码为1/0，生成 `w1.mem`、`w2.mem`、`w3.mem`；
2. 把两层BN和Sign折叠成整数阈值，生成 `th1.mem`、`th2.mem`；
3. 导出1,000张二值测试图和标签，供RTL仿真使用。

导出脚本会重新读取生成的文件，检查行数、位宽、位序和每一个比特，避免Python数组顺序与Verilog向量顺序不一致。

### 3.4 Golden Reference

`golden_reference.py` 不直接复用PyTorch层，而是读取 `.mem` 文件，按照硬件顺序执行：

```text
XNOR → Popcount → Threshold → XNOR → Popcount → Threshold
     → XNOR → Popcount → Argmax
```

它再与PyTorch模型比较完整10,000张测试图。当前结果是浮点推理与整数推理逐张一致，而不仅仅是最终准确率相同。

导出的1,000张RTL测试子集准确率为 **94.70%**，同时生成 `golden_preds.mem` 作为RTL逐张比对标准。

## 4. RTL 结构

RTL按照数学步骤拆成几个简单模块：

```text
bnn_top
├─ bnn_layer1          784 → 128
│  ├─ xnor_popcount
│  └─ threshold_compare
├─ bnn_layer2          128 → 64
│  ├─ xnor_popcount
│  └─ threshold_compare
├─ bnn_output_layer    64 → 10
│  └─ xnor_popcount
└─ argmax
```

仿真时，Testbench读取二值图像、标签和Golden预测，分别统计：

- `Accuracy`：RTL预测与真实标签的符合率；
- `Golden agreement`：RTL与整数参考模型是否逐张一致。

后者必须达到100%，否则说明RTL、阈值、位序或握手时序仍有错误。

为了让Vivado综合时真正看到固定权重，综合版本使用Python脚本把 `.mem` 转换成 `localparam` 或 `case` 中的常量。Testbench中的 `$readmemb` 只负责仿真数据加载。

## 5. PE 复用

### 5.1 全展开

最初的全展开版本使用 `generate for` 为所有神经元分别例化硬件。需要注意：Verilog中的 `generate for` 会在编译展开阶段复制电路，并不会让同一套电路在多个周期循环工作。

因此，全展开版一共生成：

```text
第一层 128套 + 第二层64套 + 输出层10套 = 202套计算单元
```

它理论上并行度很高，但第一层128棵784输入Popcount树会带来巨大的LUT占用和布线压力。Vivado OOC布局结果为 **100,254 LUT、5 FF**，最终没有完成路由。

第二版只在三层之间加入寄存器。它把跨层长路径切开，但没有减少神经元计算单元数量。Vivado OOC布局结果为 **85,270 LUT、199 FF**，中间时序明显改善，仍然没有完成路由。

这两版说明：流水线可以改善组合路径，但不能从根本上解决“同时存在太多Popcount电路”的问题。

### 5.2 16-PE 复用方案

PE（Processing Element）是一套可重复使用的神经元计算单元，负责：

```text
一组激活 + 一组权重 → XNOR → Popcount → Threshold
```

在PE复用版本中，不再为128个第一层神经元各放一套电路，而是只放16个PE：

| 层 | 输出神经元 | 物理PE | 分组数 |
|---|---:|---:|---:|
| 隐藏层1 | 128 | 16 | 8 |
| 隐藏层2 | 64 | 16 | 4 |
| 输出层 | 10 | 10 | 1 |

以第一层为例：

```text
第1拍：16个PE计算神经元 0～15
第2拍：16个PE计算神经元16～31
...
第8拍：16个PE计算神经元112～127
```

`group_idx` 决定当前选择哪一组权重，16个PE并行计算当前组，并把结果写入128-bit输出寄存器。8组完成后拉高 `done`，顶层状态机再启动第二层。

第二层需要4组，输出层需要1组，所以核心计算量为：

$$
8+4+1=13\text{个分组计算拍}
$$

当前控制还包含启动和层间 `start/done` 交接周期。各层串行执行，也没有让多张图片重叠进入流水线。因此，这个版本的目标首先是验证“用时间换面积”，而不是追求最高吞吐率。

当前综合版本仍然采用固定模型：生成脚本把权重写进 `case(group_idx)` 和 `localparam`。它已经实现了PE时分复用，但还不是从BRAM动态读取、可以随时切换权重的通用神经网络加速器。

### 5.3 Vivado 结果

测试器件为 **XC7A200T-2FBV484**，Vivado 2018.1，时钟约束为100 MHz。由于顶层直接暴露784-bit图像输入，PPA分析采用OOC模式，只考察计算核心，不代表最终板级I/O设计。

| 版本 | 实现状态 | LUT | FF | BRAM | DSP | 时序 |
|---|---|---:|---:|---:|---:|---|
| 全展开 | 布局完成，路由未完成 | 100,254 | 5 | 0 | 0 | 中间WNS -32.273 ns |
| 层间流水 | 布局完成，路由未完成 | 85,270 | 199 | 0 | 0 | 中间WNS -6.058 ns |
| 16-PE复用 | **完整路由** | **23,368** | **1,056** | **0** | **0** | Routed WNS -4.720 ns |

与全展开版相比，PE复用版的LUT减少约 **76.7%**。30,423条需要路由的网络全部完成路由，routing error为0。这说明PE复用确实解决了主要的资源密度和拥塞问题。

但路由成功不等于100 MHz时序已经通过。当前最差路径约14.41 ns，其中约73%来自布线延迟。根据WNS粗略估算，当前频率上限约为：

$$
f_{max}\approx\frac{1}{10\text{ ns}+4.720\text{ ns}}\approx67.9\text{ MHz}
$$

功能验证方面，PE复用版已完成100张阶段性RTL回归，准确率为 **97/100**，与Golden Reference **100/100一致**。Testbench可以继续扩展到完整的1,000张导出测试集。



## 6. 总结

回到最开始的神经网络，它原本逐层执行点积、BN和激活；在二值条件下，这些运算可以依次变成XNOR、Popcount和整数阈值比较，输出层再直接对Popcount做Argmax。这个变换是由 `+1/-1` 编码和BN不等式严格推导出来的。

全展开证明了算法能够直接映射成电路，PE复用最终解决了资源和路由问题。这个MNIST网络很小，单独部署没有明显实际价值，但同样的XNOR-Popcount PE可以继续用于更大的全连接层或二值卷积网络，这才是这种结构更有意义的应用方向。
