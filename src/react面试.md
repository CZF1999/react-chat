hook的作用：简化状态管理和副作用，逻辑拆分与复用
1、React组件生命周期：挂载：这是组件首次被创建并插入DOM阶段。
                    更新：当组件的props、state或者父组件重新渲染时。
                    卸载: 当组件从DOM中移除时。
                    useEffect(()=>{}),这样相当于update，每次更新都会执行
                    useEffect(()=>{ },[]),这样就会在组件挂载时执行一次
                    useEffect(()=>{ },[count]),这样就会在count改变时执行一次
                    useEffect(()=>{ return () => { } },[count]),返回一个函数，该函数会在组件 卸载/下次执行 前时执行
2、React的组件通信方式：父组件向子组件传递数据：props，回调函数向父组件传递数据
                    使用refs调用子组件暴露的方法
                    使用context组件间通信
                    使用redux/zustand组件间通信
3、state和props的区别：state是组件内部数据，props是组件外部数据
4、内置hooks：useState, useEffect, useContext, useReducer, useCallback, useMemo, useRef, useImperativeHandle, useLayoutEffect, useDebugValue  
React.memo()组件，该组件在props没有改变时，不会重新渲染,
React.lazy()和React.Suspense()组件，React.lazy()组件用于懒加载，React.Suspense()组件用于懒加载的组件的容器
useCallback()组件，useCallback()组件用于缓存函数，避免函数重复创建，从而提高性能
useMemo()组件，useMemo()组件用于缓存变量，避免变量重复计算，从而提高性能

5、useEffect和useLayoutEffect的区别：useEffect在DOM更新之后异步执行，useLayoutEffect是在DOM更新之后同步执行
6、受控组件指表单元素的值受React状态state的控制，非受控组件指表单元素值不受React状态state控制,通常通过ref获取表单值 ref={inputRef} 

fiber架构是react16重写的调和引擎，核心是让渲染过程可中断、可恢复，解决长任务阻塞页面的问题
他把组件树转换成一条链表结构，用循环方式遍历每个fiber节点，每执行一个工作单元就检查是否需要让出主线程，整个更新分为
两个阶段：Render阶段和Commit阶段,render阶段在内存里做diff,可中断；commit阶段同步操作dom，不可中断；
基于fiber,react实现优先级调度、支持并发特性。比如我们可以用usetransition把不那么重要的更新标记为低优先级，
让页面先响应用户点击，再慢慢渲染列表。
(1)本质和设计目标：
可中断的异步渲染：将同步递归的调和过程拆解为可暂停/恢复的异步任务
优先级调度：高优先级任务（用户输入）可打断低优先级任务（数据更新）
并发模式基础：
(2)fiber节点的核心设计
每个组件对应一个fiber节点，包含
fiber.tag：组件类型
状态与副作用：hooks状态如(useState)、生命周期函数如(useEffect)
调度信息：任务优先级、过期时间
链表指针
(3)fiber协调流程
阶段1：render阶段 可中断的增量计算：React将组件树进行递归的深度优先遍历

react的diff算法：使用fiber架构

1. 只对同级节点进行比较，跨层级的移动不会发生
2. 节点类型不同，直接卸载旧子树，重新挂载新子树
3. 通过key标识子节点，方便数组变化时复用
   [A,B,C] -> [B,A,D,C]
   子节点数组的diff：
4. 第一轮遍历：处理更新的节点
5. 第二轮遍历：处理剩余的节点
   可能剩下旧节点或新节点：
   只有新节点剩余：直接挂载
   旧节点剩余：卸载旧节点
   新旧都有剩余：进入节点移动逻辑
6. 节点移动逻辑：
   react会把剩余旧节点放入Map<key, fiber>,然后遍历剩余新节点数组
   1. 通过key在map查找旧节点，找到且可复用则复用；找不到则新建
   2. 复用时，比较旧节点的旧索引和一个lastPlaceIndex(记录最后一个可复用节点在旧数组中的索引)
      如果旧索引大于lastPlaceIndex，则说明该节点相对顺序是对的，可以原地不动，更新lastPlaceIndex为旧索引,从旧索引中删除该旧节点。
      如果旧索引小于lastPlaceIndex，则说明该节点相对顺序不对，需要向右移动，React会调用placeChild将其标记为移到
   3. 遍历结束后，map中剩余的节点都是需要删除的

总起
“Fiber 是 React 16 重写的调和引擎，它核心目的是让渲染过程可中断、可恢复，解决以前递归同步渲染长时间占用主线程导致卡顿的问题。”
两阶段流程
“整个更新分为两个阶段：
Render 阶段：在内存中进行 Diff，生成新的 Fiber 树并标记副作用（增删改），这个阶段可以被时间切片打断。
Commit 阶段：把 Render 阶段的副作用同步应用到真实 DOM，这个阶段不可中断，保证 UI 一致性。”
可中断的秘密：循环替代递归
“为了实现可中断，Fiber 把组件树转换成了由 child、sibling、return 指针连接的单链表结构。React 用一个循环来遍历这些工作单元，每执行完一个节点就检查一下是否还有剩余时间，没时间了就暂停，把主线程让给浏览器。”
优先级与并发
“基于 Fiber，React 实现了优先级调度（Lane 模型）。高优任务（如用户输入）可以打断低优渲染。我们在开发中用的 useTransition 或 useDeferredValue，本质上就是利用这个机制，把不紧急的更新标记为低优先级，优先保证界面响应。”
Diff 算法部分（可以分层回答，先讲规则再讲移动）
“在 Render 阶段，React 使用 Diff 算法对比新旧 Fiber 树，核心策略有三条：
只比较同级节点，跨层级移动直接销毁重建。
节点类型不同（如 div 变 span），直接卸载旧子树，挂载新子树。
通过 key 来标识子节点，达到最大复用。
对于子节点数组的对比，React 采用两轮遍历：
第一轮：按顺序同步比较新旧节点，处理没有移动的更新。
第二轮：把剩余旧节点放入一个以 key 为键的 Map 中，然后遍历剩余新节点，通过 key 在 Map 中查找可复用的 Fiber。找到后，会比较旧节点的原始索引和一个叫做 lastPlacedIndex 的变量（初始为 0）。如果旧索引大于等于 lastPlacedIndex，说明这个节点相对顺序没变，原地复用，并更新 lastPlacedIndex；如果旧索引小于 lastPlacedIndex，说明节点需要向右移动，React 会将其标记为插入操作。遍历结束后，Map 里剩下的旧节点全部打上删除标记。”

虚拟DOM是真实DOM的JS对象抽象表示，React在内存中维护一颗虚拟DOM树，最后批量应用到真实DOM上
减少直接DOM操作，高效的diff策略，fiber架构，

fiber架构是react16重写调和引擎，主要目的是在渲染阶段可中断、可恢复，避免递归同步渲染时阻塞主线程
主要有两个阶段，render阶段和commit阶段。render阶段，在内存中执行diff，生成新的fiber树，并执行副作用增删改，这个阶段可以被时间切片打断
commit阶段，将render阶段生成的fiber树应用到真实DOM上，这个阶段不能被时间切片截断
为了实现可中断，fiber把组件树转换成由child,sibling,return指针连接的单链表结构。
react用一个循环来遍历这些工作单元，每执行完一个节点就检查一下是否还有剩余时间，没时间了就暂停，把主线程让给浏览器
优先级与并发 基于fiber,react实现优先级调度。高优任务如用户输入可打断低优任务，
Diff算法部分
在render阶段，react使用diff算法来比较新旧fiber树，核心策略有三条：
只比较同级节点，跨层级移动直接销毁重建。节点类型不同，直接卸载旧子树，挂载新子树
通过key来标识子节点，达到最大复用
对于子节点数组的对比，react采用两轮遍历：第一轮：按照顺序同步比较新旧节点，处理没有移动的更新
第二轮：把剩余旧节点放入一个以key为键的map中，然后遍历剩余节点，通过 key 在 Map 中查找可复用的 Fiber。找到后，会比较旧节点的原始索引和一个叫做 lastPlacedIndex 的变量（初始为 0）。如果旧索引大于等于 lastPlacedIndex，说明这个节点相对顺序没变，原地复用，并更新 lastPlacedIndex；如果旧索引小于 lastPlacedIndex，说明节点需要向右移动，React 会将其标记为插入操作。遍历结束后，Map 里剩下的旧节点全部打上删除标记。”
