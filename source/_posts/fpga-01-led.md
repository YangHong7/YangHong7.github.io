---
title: FPGA入门 — LED流水灯实现
date: 2026-07-01 10:00:00
categories:
  - 嵌入式
  - FPGA
tags:
  - Verilog
  - Vivado
---
## 实验目标

控制开发板上的 4 个 LED 实现流水灯效果。

## 硬件连接

开发板型号：xc7a75t，LED 连接在 FPGA 的 GPIO 引脚上，高电平有效。

## Verilog 代码

```verilog
module led_flow(
    input clk_50M,
    input rst,
    output reg [3:0] led
);

reg [31:0] cnt;

// 分频计数器，产生约 1s 的定时
always @(posedge clk_50M or posedge rst) begin
    if (rst)
        cnt <= 0;
    else if (cnt >= 50_000_000 - 1)
        cnt <= 0;
    else
        cnt <= cnt + 1;
end

// 每 1s 切换一次 LED 状态
always @(posedge clk_50M or posedge rst) begin
    if (rst)
        led <= 4'b0001;
    else if (cnt == 0)
        led <= {led[2:0], led[3]};  // 循环左移
end

endmodule
```

## 仿真测试

编写 testbench 验证功能：

```verilog
module tb_led_flow();
    reg clk;
    reg rst;
    wire [3:0] led;

    led_flow uut (
        .clk_50M(clk),
        .rst(rst),
        .led(led)
    );

    initial begin
        clk = 0;
        forever #10 clk = ~clk;
    end

    initial begin
        rst = 1;
        #100 rst = 0;
        #2000 $finish;
    end
endmodule
```

## 管脚约束

```tcl
set_property PACKAGE_PIN U4 [get_ports {led[0]}]
set_property PACKAGE_PIN U5 [get_ports {led[1]}]
set_property PACKAGE_PIN V6 [get_ports {led[2]}]
set_property PACKAGE_PIN V7 [get_ports {led[3]}]
set_property IOSTANDARD LVCMOS33 [get_ports {led[*]}]
```

## 总结

流水灯是 FPGA 入门的基础实验，核心是**分频计数**和**移位寄存器**两个知识点。
