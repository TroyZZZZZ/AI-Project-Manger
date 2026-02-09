// 测试React应用是否正常加载
console.log("开始测试React应用...");

// 检查页面基本元素
const rootElement = document.getElementById("root");
console.log("Root元素:", rootElement);

if (rootElement) {
    console.log("Root元素内容:", rootElement.innerHTML);
    console.log("Root元素子节点数量:", rootElement.children.length);
    
    // 监听DOM变化
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === "childList") {
                console.log("DOM发生变化:", mutation);
                console.log("新的Root内容:", rootElement.innerHTML);
            }
        });
    });
    
    observer.observe(rootElement, {
        childList: true,
        subtree: true
    });
    
    // 5秒后停止观察
    setTimeout(() => {
        observer.disconnect();
        console.log("最终Root内容:", rootElement.innerHTML);
        console.log("最终子节点数量:", rootElement.children.length);
    }, 5000);
} else {
    console.error("未找到root元素!");
}

// 检查是否有React相关的全局变量
setTimeout(() => {
    console.log("React相关检查:");
    console.log("window.React:", typeof window.React);
    console.log("window.__REACT_DEVTOOLS_GLOBAL_HOOK__:", typeof window.__REACT_DEVTOOLS_GLOBAL_HOOK__);
}, 2000);
