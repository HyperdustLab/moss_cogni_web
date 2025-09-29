// 测试修改后的递归处理
const testExample = "股票分析 - 苹果(AAPL): 上涨2.1% - 谷歌(GOOGL): 下跌1.5% - 微软(MSFT): 上涨1.8%";
const userExample = "- 道琼斯工业平均指数: 46,247.29点，上涨0.65% (+299.97点) - 标普500指数: 6,643.70点，上涨0.59% (+38.98点)";

console.log("测试例子:", testExample);
console.log("用户例子:", userExample);

// 模拟修改后的处理逻辑
function processDashLinebreaks(text) {
  let html = text;
  let prevHtml = '';
  
  while (prevHtml !== html) {
    prevHtml = html;
    html = html.replace(/([^\n])\s*-\s+([^-\n]+)/g, '$1<br>- $2');
    html = html.replace(/\n\s*-\s+([^-\n]+)/g, '<br>- $1');
  }
  
  return html;
}

const testResult = processDashLinebreaks(testExample);
const userResult = processDashLinebreaks(userExample);

console.log("\n测试例子处理结果:");
console.log(testResult);
console.log("显示效果:");
console.log(testResult.replace(/<br>/g, '\n'));

console.log("\n用户例子处理结果:");
console.log(userResult);
console.log("显示效果:");
console.log(userResult.replace(/<br>/g, '\n'));