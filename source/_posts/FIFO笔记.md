---
title: FIFO笔记
date: 2026-07-20
aside: false
description: 记录同步与异步 FIFO 的结构、空满判断、指针设计及仿真验证。
cover: "/img/posts/Pasted image 20260720120551.png"
tags:
  - FIFO
  - 存储器设计
  - RTL
categories:
  - 数字 IC
---


### 同步FIFO的设计和仿真

使用计数器来判断FIFO的空和满；每次写入时w_ptr 加1，count加1；每次读出时r_ptr 加1，count减1；但count =0时FIFO为空，但count =DEPTH 时FIFO写满。

w_ptr与r_ptr 同时也是FIFO存结构的写读地址（区别于异步FIFO里面高位扩充的gray码形式w_ptr和r_ptr）。

full和empty可以采用组合逻辑判断输出，此时读写和指针移动直接用full和empty信号作为操作判断；如果采用时序输出，需要先引入full_value、empty_value计算结果，在打拍写入full、empty，这时候读写和指针移动用full_value和empty_value信号作为操作判断。

考虑RAM读写冲突的可能性，读和写在同一地址的情况只有两种，满和空时同时读写。我写的代码时保守型的FIFO，在以上两种情况下对操作的处理分别是只读不写、只写不读，对数据起到充分缓冲。

<img src="/img/posts/Pasted%20image%2020260720163126.png" width="586"/>



<img src="/img/posts/Pasted%20image%2020260720161633.png" width="679"/>

<img src="/img/posts/Pasted%20image%2020260720161707.png" width="688"/>



更加激进的低延时流水操作是
1. FIFO 为空（empty）时同时读写：写入的数据立即被读（read data = write data）。这是一种常见且合法的操作（bypass FIFO）。
2. FIFO 为满（full）时同时读写：读操作会腾出一个位置，写操作会填入新数据。(ASIC设计大多是这样)
3. 普通情况（既不满也不空）：写指针和读指针同时递增，FIFO 占用深度保持不变。

summary: full 时同时读写，full 保持；empty 时同时读写，取决于是否支持 bypass，普通 FIFO 会解除 empty，高性能 FIFO 通常保持 empty。
设计核心：
```c
//读成功
rd_fire = rd_en && (!empty || wr_en_bypass);
//写成功
wr_fire = wr_en && (!full || rd_en);
//计数逻辑
count_next = count + wr_fire - rd_fire;
```


**standard mode 和 FWFT mode**

FWFT模式空满信号延时两个周期，IP设置深度是实际大小会增加2

<img src="/img/posts/Pasted%20image%2020260720120551.png" width="697"/>


#### 异步FIFO的设计和仿真

<img src="/img/posts/Pasted%20image%2020260720161818.png" width="671"/>

<img src="/img/posts/Pasted%20image%2020260720161916.png" width="684"/>
