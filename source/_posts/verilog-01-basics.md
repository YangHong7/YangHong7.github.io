---
title: Verilog 基础语法速查
date: 2026-07-07 16:00:00
categories:
  - 嵌入式
  - FPGA
tags:
  - Verilog
  - 笔记
---
## 模块结构

```verilog
module counter #(
    parameter WIDTH = 8
)(
    input clk,
    input rst,
    output reg [WIDTH-1:0] count
);
    always @(posedge clk or posedge rst) begin
        if (rst)
            count <= 0;
        else
            count <= count + 1;
    end
endmodule
```

## 常用语法

| 类型 | 写法 | 说明 |
|------|------|------|
| 寄存器 | `reg [7:0] a;` | 8 位寄存器 |
| 连线 | `wire [7:0] b;` | 组合逻辑连线 |
| 参数 | `parameter N = 8;` | 模块参数 |
| 赋值 | `assign a = b & c;` | 组合逻辑 |
| 时序 | `always @(posedge clk)` | 时序逻辑 |

## 阻塞 vs 非阻塞

- **阻塞赋值 `=`**：用于组合逻辑（`always @(*)`）
- **非阻塞赋值 `<=`**：用于时序逻辑（`always @(posedge clk)`）

## 状态机

```verilog
localparam IDLE  = 2'b00;
localparam START = 2'b01;
localparam DONE  = 2'b10;

reg [1:0] state, next_state;

always @(posedge clk or posedge rst) begin
    if (rst) state <= IDLE;
    else state <= next_state;
end

always @(*) begin
    case (state)
        IDLE: next_state = start ? START : IDLE;
        START: next_state = DONE;
        DONE: next_state = IDLE;
    endcase
end
```
