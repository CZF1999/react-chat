1、React组件生命周期：挂载：这是组件首次被创建并插入DOM阶段。
    更新：当组件的props、state或者父组件重新渲染时。
    卸载: 当组件从DOM中移除时。
    useEffect(()=>{ },[]),这样就会在组件挂载时执行一次
    useEffect(()=>{ },[count]),这样就会在count改变时执行一次
    useEffect(()=>{ return () => { } },[count]),返回一个函数，该函数会在组件 卸载/下次执行 前时执行
2、React的组件通信方式：父组件向子组件传递数据：props，回调函数向父组件传递数据
    使用refs调用子组件暴露的方法
    使用context组件间通信
    使用redux/zustang组件间通信
3、state和props的区别：state是组件内部数据，props是组件外部数据
4、内置hooks：useState, useEffect, useContext, useReducer, useCallback, useMemo, useRef, useImperativeHandle, useLayoutEffect, useDebugValue
5、useEffect和useLayoutEffect的区别：useEffect在DOM更新之后异步执行，useLayoutEffect是同步执行
6、受控组件指表单元素的值受React状态state的控制，非受控组件指表单元素值不受React状态state控制


fiber架构是react16重写的核心协调引擎，主要解决之前是使用堆栈调和器，同步且不可断，掉帧的问题
以前React用递归方式
将一个庞大的更新任务，拆解成许多微小的工作单元，在每完成一个工作单元的时候，将控制权交还给浏览器，检查是否有更高优先级的任务，这个过程可中断、可恢复的
两个阶段 渲染/调和阶段   render  这是一个可中断的异步阶段，构建工作树的fiber树，计算出所有节点的变更，此过程可以被暂停、重做、丢弃不会产生用户副作用
                       commit  commit阶段，负责同步地把变化应用到真实的DOM,这个阶段不可中断