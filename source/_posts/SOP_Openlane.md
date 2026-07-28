---
title: Openlane工具链部署和使用
date: 2026-07-17
tags:
  - Openlane
  - 工具使用
  - 数字IC
categories:
  - 数字IC
---


---

# SOP：WSL2 + Docker 搭建 OpenLane 数字芯片综合与 STA 流程

> **文档说明**：本指南涵盖从 Windows 11 环境准备、Docker 容器搭建、开源 EDA 工具链激活，到 RTL 逻辑综合（Yosys）、静态时序分析（OpenSTA）以及数字后端布局布线（OpenLane）的完整实操流程。

---

## 目录
- [第一阶段：搭建 Windows + WSL2 环境](#第一阶段搭建-windows--wsl2-环境)
- [第二阶段：OpenLane 仓库克隆与 Docker 启动](#第二阶段openlane-仓库克隆与-docker-启动)
- [第三阶段：数字前端流程 (Synthesis & STA & GLS)](#第三阶段数字前端流程-synthesis--sta--gls)
- [第四阶段：数字后端流程 (P&R)](#第四阶段数字后端流程-pr)
- [第五阶段：设计产物与验收](#第五阶段设计产物与验收)
- [附录：前端运行脚本与配置文件详解](#附录前端运行脚本与配置文件详解)

---

## 第一阶段：搭建 Windows + WSL2 环境

### 一、 准备工程目录结构
在 Windows 本地磁盘（如 `D:` 盘）建立标准化项目目录。该目录后续将直接挂载至 Docker 容器内的 `/work` 目录：

```text
D:\IC\risc_practice\phase3\           <-- 对应容器内的 /work
├── config.json                       # OpenLane 后端 P&R 配置文件
├── rtl/                              # 1. RTL 源代码目录 (*.v / *.sv)
├── syn/                              # 2. 逻辑综合脚本 (synth.tcl)
├── sta/                              # 3. STA 约束与分析脚本 (sta.sdc, sta.tcl)
└── rep/                              # 4. 终极产物与报告输出目录 (网表, 报告)
```

### 二、 开启 WSL2 (Ubuntu)
在 Windows 11 中开启 WSL2 支持。打开 PowerShell 验证版本：

```powershell
wsl -l -v
```

> **要求**：确保指定的 Linux 发行版（如 Ubuntu）的 `VERSION` 显示为 `2`。

### 三、 配置 Docker Desktop
1. 下载并安装 Docker Desktop，全程保持默认设置。
2. 确保勾选 **`Use WSL 2 instead of Hyper-V (recommended)`**。
3. 打开 Docker Desktop 设置界面，开启 **WSL 深度集成 (WSL Integration)**，勾选对应的 Ubuntu 发行版。

---

## 第二阶段：OpenLane 仓库克隆与 Docker 启动

### 四、 克隆 OpenLane 仓库
进入 WSL2 Linux 环境的 `home` 目录下拉取 OpenLane 官方仓库：

```bash
cd ~
git clone https://github.com/The-OpenROAD-Project/OpenLane.git
cd OpenLane
make   # Makefile 会自动下载官方 Docker 镜像并配置 Volare PDK 管理工具
```
注意不要在/mnt下运行，读写会有一堆问题

#### OpenLane 内置开源 EDA 工具链概览

| 工具名称 | 核心用途 | 说明 |
| :--- | :--- | :--- |
| **Yosys** | 逻辑综合 | 将 RTL 代码转化为门级网表 (Gate-Level Netlist) |
| **OpenSTA** | 静态时序分析 | 计算 Slack、最大时钟频率 ($f_{max}$)，定位关键路径 |
| **OpenROAD** | 后端布局布线 | 包含 Floorplan、Placement、CTS、Routing 等全套子工具 |
| **KLayout** | 版图查看 | 查看与导出 GDSII 版图文件 |
| **Volare** | PDK 版本管理 | 自动化管理与切换 SkyWater 130nm 等开源 PDK |

### 五、 启动容器并激活 Sky130 PDK
使用 PowerShell 将本地工程挂载到容器 `/work` 目录，并激活指定的 Sky130 PDK 版本：

```powershell
# 1. 启动容器并挂载本地目录
docker run -dit --name sta_analysis -v "D:\IC\risc_practice\phase3:/work" efabless/openlane:latest

# 2. 激活 Sky130 PDK 版本
docker exec sta_analysis volare enable --pdk sky130 bdc9412b3e468c102d01b7cf6337be06ec6e9c9a
```

---

## 第三阶段：数字前端流程

### 六、 逻辑综合 (Yosys)
运行 Yosys 自动化综合脚本，生成门级网表：

```bash
docker exec -it sta_analysis yosys -s /work/syn/synth.tcl
```

### 七、 静态时序分析 (OpenSTA)
运行 OpenSTA 检查建立/保持时间裕量 (Setup/Hold Slack) 与功耗报告：

```bash
docker exec -it sta_analysis sta /work/sta/sta.tcl
```

### 八、 门级仿真 (GLS)
将综合后生成的 `synth.v` 网表、晶体管仿真模型 `sky130.v` 与 Testbench 一起进行门级功能验证。

---

## 第四阶段：数字后端流程 (P&R)

### 九、 运行 OpenLane 交互式后端流程

#### Step 1: 进入容器 Bash 终端
```bash
docker exec -it sta_analysis bash
```

#### Step 2: 进入 OpenLane 运行目录
```bash
cd /openlane
```
> **技巧**：若路径不正确，可执行 `find / -name "flow.tcl" 2>/dev/null` 查找。

#### Step 3: 启动 OpenLane 交互界面
```bash
./flow.tcl -interactive
# 控制台提示符变为 %，表示成功进入 OpenLane Tcl 环境
```

#### Step 4: 依次执行后端设计步骤
在 `%` 提示符下逐行运行：

```tcl
package require openlane                     ;# 1. 加载 OpenLane 自动化包
prep -design /work -tag run1 -overwrite      ;# 2. 载入 config.json 项目配置环境

run_synthesis                                ;# 3. 运行后端标准化综合
run_floorplan                                ;# 4. 楼层规划 (画 Die 面积与电源网格 PDN)
run_placement                                ;# 5. 标准单元布局 (放置标准门电路)
run_cts                                      ;# 6. 时钟树综合 (插入 Clock Buffer 优化 Clock Tree)
run_routing                                  ;# 7. 详细布线 (耗时最久，查看 logs/routing/25-detailed.log)
run_magic                                    ;# 8. DRC 版图检查与导出 GDSII 文件
```

---

## 第五阶段：设计产物与验收

设计运行完成后，核心成果将输出在本地目录的 `rep/` 及 `runs/` 中：

### 前后端核心产物清单

| 类别 | 文件路径 | 文件说明 |
| :--- | :--- | :--- |
| **前端产物** | `rep/synth.v` | 逻辑综合后生成的门级网表文件 |
| | `rep/sta_setup.rpt` | Max Path Setup 时序分析报告（查看 Slack 裕量） |
| | `rep/power.rpt` | 芯片功耗估算报告 |
| **后端产物** | `runs/run1/results/signoff/open_risc_v.gds` | **终极版图文件 (GDSII)** |
| | `runs/run1/results/placement/` | 布局后的 DEF 文件目录 |
| | `runs/run1/logs/` | 各阶段详细运行 Log 日志（按 Step 序号排列） |

---

## 附录：前端运行脚本与配置文件示例

### 一、 编写 Yosys 综合脚本 (`syn/synth.tcl`)

```tcl
# 1. 读取所有 RTL 源代码文件（根据依赖顺序，defines.v 优先）
read_verilog -sv -I/work/rtl /work/rtl/defines.v
read_verilog -sv -I/work/rtl /work/rtl/ifetch.v
read_verilog -sv -I/work/rtl /work/rtl/if_id.v
read_verilog -sv -I/work/rtl /work/rtl/id.v
read_verilog -sv -I/work/rtl /work/rtl/id_ex.v
read_verilog -sv -I/work/rtl /work/rtl/ex.v
read_verilog -sv -I/work/rtl /work/rtl/pc_reg.v
read_verilog -sv -I/work/rtl /work/rtl/regs.v
read_verilog -sv -I/work/rtl /work/rtl/ram.v
read_verilog -sv -I/work/rtl /work/rtl/rom.v
read_verilog -sv -I/work/rtl /work/rtl/simple_dual_ram.v
read_verilog -sv -I/work/rtl /work/rtl/riscv_top.v
read_verilog -sv -I/work/rtl /work/rtl/open_risc_v_soc.v

# 2. 顶层层次检查与过程块展开 (-top 后接顶层模块名)
hierarchy -check -top open_risc_v
proc
opt

# 3. 将 Memory 拆解为标准 DFF (防止 Regfile 无法映射到标准门)
memory_dff
memory_map
opt

# 4. 解锁带 Enable 使能端的 DFF 为 MUX + 普通 DFF
techmap
opt

# 5. 映射 DFF 到 Sky130 工艺库 (精准映射带低电平异步复位的 DFF)
dfflegalize -cell $_DFF_PN0_ 0 -cell $_DFF_P_ 0 -cell $_DFF_PP0_ 0
dfflibmap -liberty /root/.volare/volare/sky130/versions/c6d73a35f524070e85faff4a6a9eef49553ebc2b/sky130A/libs.ref/sky130_fd_sc_hd/lib/sky130_fd_sc_hd__tt_025C_1v80.lib

# 6. 映射组合逻辑
abc -liberty /root/.volare/volare/sky130/versions/c6d73a35f524070e85faff4a6a9eef49553ebc2b/sky130A/libs.ref/sky130_fd_sc_hd/lib/sky130_fd_sc_hd__tt_025C_1v80.lib
opt_clean -purge

# 7. 清除属性并导出网表
write_verilog -noattr /work/rep/synth.v
```

> **综合注意事项**：
> 1. **头文件顺序**：`defines.v` 等宏定义文件必须排在最前方。
> 2. **消除抽象门/Latch**：必须使用 `memory_dff` 和 `memory_map`。若未正确映射，网表中会残留 `$_DLATCH_N_` 或 `$_DFF_PN0_` 等抽象器件，导致后续 **OpenSTA 时序分析直接崩溃**。
> 3. **网表质量自检**：综合完成后，建议在 PowerShell 中搜索生成的网表，**确保输出为 0 行结果**：
>    ```powershell
>    Select-String -Path "D:\IC\risc_practice\phase3\rep\synth.v" -Pattern "always"
>    Select-String -Path "D:\IC\risc_practice\phase3\rep\synth.v" -Pattern "\$_"
>    ```

---

### 二、 编写 STA 时序约束文件 (`sta/sta.sdc`)

```tcl
# 1. 定义主时钟 clk，周期设为 10.0 ns (对应 100MHz 目标频率)
create_clock -name clk -period 10.0 [get_ports clk]

# 2. 设置输入延迟 (排除 clk 端口本身，避免 Warning)
set_input_delay 2.0 -clock clk [get_ports * -filter "direction == input && name != clk"]

# 3. 设置输出延迟
set_output_delay 2.0 -clock clk [all_outputs]
```

---

### 三、 编写 OpenSTA 分析脚本 (`sta/sta.tcl`)

```tcl
# 1. 读入 Sky130 物理时序库 (.lib)
read_liberty /root/.volare/volare/sky130/versions/c6d73a35f524070e85faff4a6a9eef49553ebc2b/sky130A/libs.ref/sky130_fd_sc_hd/lib/sky130_fd_sc_hd__tt_025C_1v80.lib

# 2. 读入综合门级网表
read_verilog /work/rep/synth.v

# 3. 绑定顶层模块
link_design open_risc_v

# 4. 读入 SDC 约束文件
read_sdc /work/sta/sta.sdc

# 5. 输出 Setup / Hold 时序报告与功耗报告至 rep/ 目录
report_checks -path_delay max -format full_clock_expanded -digits 4 > /work/rep/sta_setup.rpt
report_checks -path_delay min -format full_clock_expanded -digits 4 > /work/rep/sta_hold.rpt
report_power > /work/rep/power.rpt

exit
```

---

### 四、 编写 OpenLane 后端配置文件 (`config.json`)

```json
{
    "DESIGN_NAME": "open_risc_v",
    "VERILOG_FILES": [
        "dir::rtl/defines.v",
        "dir::rtl/open_risc_v_soc.v"
    ],
    "CLOCK_PORT": "clk",
    "CLOCK_PERIOD": 10.0,
    "FP_CORE_UTIL": 40,
    "PL_TARGET_DENSITY": 0.45,
    "FP_PDN_MULTILAYER": true
}
```

> **参数说明**：`FP_CORE_UTIL: 40` 代表逻辑单元占用芯片 Core 面积的 40%，预留 60% 空间供金属线网布线，可有效规避后端 Routing 拥塞 (Congestion)。

---

### 五、 常用容器运维指令

在 Windows PowerShell 中执行的日常容器维护命令：

```powershell
# 1. 查看所有容器状态 (包括运行中与暂停的)
docker ps -a

# 2. 启动已休眠的容器
docker start sta_analysis

# 3. 进入运行中的容器 Bash
docker exec -it sta_analysis bash

# 4. 停止并删除容器
docker stop sta_analysis
docker rm sta_analysis

# 5. 一键重新创建容器并挂载工程目录
docker run -dit --name sta_analysis -v "D:\IC\risc_practice\phase3:/work" efabless/openlane:latest
docker exec sta_analysis volare enable --pdk sky130 c6d73a35f524070e85faff4a6a9eef49553ebc2b
```