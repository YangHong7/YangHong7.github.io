---
title: 测试文章 — 表格与代码渲染
date: 2026-07-10 18:00:00
categories:
  - 嵌入式
  - FPGA
tags:
  - Verilog
  - 测试
---
本实验使用 Xilinx xc7a75t 系列 FPGA，测试表格和代码块的渲染效果。

## 一、资源对比表

ROM 功能的实现可以采用分布式内存（Distributed Memory）或者块内存（Block Memory）。

| 对比项 | 分布式内存 (Distributed Memory) | 块内存 (Block Memory / BRAM) |
|:---|:---|:---|
| 物理底座 | 使用逻辑电路中的 LUT（查找表） | FPGA 芯片中自带的专用存储块 |
| 适合场景 | 极小容量（如 16 depth） | 大容量、高带宽 |
| 资源消耗 | 消耗逻辑资源（LUTs） | 消耗 BRAM 块（不占逻辑） |
| 灵活性 | 非常快，配置灵活 | 有固定格式，按块使用 |

本实验数据量极小，故采用分布式内存。

## 二、IP 配置步骤

### 2.1 配置参数表

| 参数 | 值 | 说明 |
|:---|:---|:---|
| Depth | 16 | 实际只需 12 种状态 |
| Data Width | 11 | 4 位位选 + 7 位段选 |
| Default Data | 0 | COE 默认值 |
| Radix | 16 | 十六进制 |

### 2.2 COE 文件

```
memory_initialization_radix=16;
memory_initialization_vector=
01E,
01D,
01B,
017,
027,
047,
087,
08B,
08D,
08E,
10E,
20E,
000,
000,
000,
000;
```

## 三、Verilog 代码

以下代码实现 LED 状态循环显示：

```verilog
module LED_SHOW(
    input clk_3Hz,
    input rst,
    input en,            // rst 和 en 高电平有效
    output reg [6:0] seg,
    output reg [3:0] dig
);

reg [3:0] count;

// 状态转换和动态显示共用同一时钟域
// 避免直接分频引起亚稳态
always @(posedge clk_50M or posedge rst) begin
    if (rst)
        count <= 4'b0000;
    else if (en) begin
        if (count == 4'b1011)
            count <= 0;
        else
            count <= count + 1;
    end
end

// ROM 实例化
wire [10:0] rom_data;

blk_mem_gen_1 rom_inst (
    .clka(clk_3Hz),
    .addra(count),
    .douta(rom_data)
);

// 动态显示
always @(posedge clk_3Hz) begin
    seg <= rom_data[10:4];
    dig <= rom_data[3:0];
end

endmodule
```

## 四、管脚约束

```tcl
set_property PACKAGE_PIN U4 [get_ports {led[0]}]
set_property PACKAGE_PIN U5 [get_ports {led[1]}]
set_property PACKAGE_PIN V6 [get_ports {led[2]}]
set_property PACKAGE_PIN V7 [get_ports {led[3]}]
set_property IOSTANDARD LVCMOS33 [get_ports {led[*]}]
```

## 五、仿真结果

| 信号 | 波形说明 | 预期结果 |
|:---|:---|:---|
| clk_50M | 50MHz 时钟输入 | 周期 20ns |
| rst | 复位信号（高有效） | 清零所有寄存器 |
| count | 状态计数（0-11 循环） | 每 1s 递增 |
| led | LED 输出 | 流水灯效果 |

### 关键注意事项

- 状态转换和动态显示的频率可以不同，但**必须使用板上同一个时钟**
- 尽量把**所有逻辑放在同一个时钟域**下运行，避免亚稳态
- 如果需要分频，引入**使能位**结合原时钟域实现分频效果

## 六、总结

本文测试了以下 Markdown 元素的渲染效果：

1. **表格** — 对比表、参数表、预期结果表
2. **代码块** — Verilog、Tcl
3. **标题层级** — h2~h4
4. **列表** — 有序和无序
5. **行内代码** — 如 `posedge clk`、`reg [3:0]`
