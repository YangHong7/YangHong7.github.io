---
title: 嵌入式开发环境搭建记录
date: 2026-07-05 09:30:00
categories:
  - 嵌入式
tags:
  - 环境搭建
  - 嵌入式
---
## 工具链安装

### ARM GCC

```bash
sudo apt install gcc-arm-none-eabi
# 验证
arm-none-eabi-gcc --version
```

### OpenOCD

```bash
git clone https://github.com/openocd-org/openocd.git
cd openocd
./bootstrap
./configure --enable-stlink
make -j4
sudo make install
```

## STM32 开发

使用 STM32CubeMX 生成初始化代码，然后用 Makefile 编译：

```makefile
CC = arm-none-eabi-gcc
CFLAGS = -mcpu=cortex-m4 -mthumb -O2

all: firmware.elf

firmware.elf: main.o
    $(CC) $(CFLAGS) -o $@ $^

flash:
    openocd -f interface/stlink.cfg -f target/stm32f4x.cfg -c "program firmware.elf verify reset exit"
```

## 调试

```bash
openocd -f interface/stlink.cfg -f target/stm32f4x.cfg &
arm-none-eabi-gdb firmware.elf -ex "target remote localhost:3333"
```

## 总结

嵌入式开发的工具链配置比较繁琐，记录一下方便以后重装。
