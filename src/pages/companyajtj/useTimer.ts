import { useEffect, useState } from 'react';
const useTimer = (initialCount: number) => {
    const [count, setCount] = useState(initialCount);
    useEffect(() => {
        const timer = setInterval(() => {
            setCount(prevCount => prevCount + 1);
            setTimeout(() => {
                console.log(count);
            }, 1000);
        }, 1000);
        return () => {
            clearInterval(timer);
        }
    }, []);
    // 监听外部传入的 initialCount 变化，并重置内部状态
    // useEffect(() => {
    //     setCount(initialCount);
    // }, [initialCount]);
    return count;
}

export default useTimer;