/**
 * 解析Amazon搜索结果数
 * 示例: "1-48 of over 200,000 results for" -> 200000
 * 示例: "1-48 of 5,000 results for" -> 5000
 * 示例: "7 results for "geogard ect"" -> 7
 */
export function parseSearchResults(text: string): number | null {
  try {
    // 方法1: 匹配 "of over X results" 或 "of X results"
    let match = text.match(/of\s+(?:over\s+)?([\d,]+)\s+results/i);
    if (match && match[1]) {
      return parseInt(match[1].replace(/,/g, ''), 10);
    }

    // 方法2: 匹配简单格式 "X results for"（少量结果时的格式）
    match = text.match(/^(\d+)\s+results?\s+for/i);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }

    // 方法3: 匹配任何 "数字 + results" 的模式
    match = text.match(/([\d,]+)\s+results?/i);
    if (match && match[1]) {
      return parseInt(match[1].replace(/,/g, ''), 10);
    }

    return null;
  } catch (error) {
    console.error('解析搜索结果数失败:', error);
    return null;
  }
}

/**
 * 解析月销量
 * 示例: "9K+ bought in past month" -> 9000
 * 示例: "500+ bought in past month" -> 500
 * 示例: "1.5K+ bought in past month" -> 1500
 */
export function parseMonthSales(text: string): number | null {
  try {
    // 匹配数字和单位（K、M等）
    const match = text.match(/([\d.]+)([KkMm]?)\+?\s*bought/i);
    if (match && match[1]) {
      let value = parseFloat(match[1]);
      const unit = match[2]?.toUpperCase();
      
      // 处理单位转换
      if (unit === 'K') {
        value *= 1000;
      } else if (unit === 'M') {
        value *= 1000000;
      }
      
      return Math.floor(value);
    }
    return null;
  } catch (error) {
    console.error('解析月销量失败:', error);
    return null;
  }
}

/**
 * 解析评论数
 * 示例: "1,958 ratings" -> 1958
 * 示例: "10 ratings" -> 10
 */
export function parseReviews(text: string): number | null {
  try {
    // 移除逗号并提取数字
    const match = text.match(/([\d,]+)\s*rating/i);
    if (match && match[1]) {
      return parseInt(match[1].replace(/,/g, ''), 10);
    }
    return null;
  } catch (error) {
    console.error('解析评论数失败:', error);
    return null;
  }
}

/**
 * 从链接文本中提取评论数
 * 处理多种格式:
 * - "1,958 ratings"
 * - "10 ratings" 
 * - "(1,958)"
 * - "(36.1K)" -> 36100
 * - "1958 customer ratings"
 * - "See all 1,958 reviews"
 */
export function extractReviewsFromLink(linkText: string): number | null {
  try {
    // 方法1: 匹配括号内的数字（带单位），例如 "(36.1K)"
    let match = linkText.match(/\(([\d,.]+)([KkMm]?)\)/);
    if (match && match[1]) {
      let value = parseFloat(match[1].replace(/,/g, ''));
      const unit = match[2]?.toUpperCase();
      
      // 处理单位转换
      if (unit === 'K') {
        value *= 1000;
      } else if (unit === 'M') {
        value *= 1000000;
      }
      
      const num = Math.floor(value);
      if (!isNaN(num) && num > 0) {
        return num;
      }
    }
    
    // 方法2: 匹配 "数字 + 单位 + rating" 格式，例如 "36.1K ratings"
    match = linkText.match(/([\d,.]+)([KkMm]?)\s*(?:customer\s+)?rating/i);
    if (match && match[1]) {
      let value = parseFloat(match[1].replace(/,/g, ''));
      const unit = match[2]?.toUpperCase();
      
      if (unit === 'K') {
        value *= 1000;
      } else if (unit === 'M') {
        value *= 1000000;
      }
      
      const num = Math.floor(value);
      if (!isNaN(num) && num > 0) {
        return num;
      }
    }
    
    // 方法3: 匹配 "数字 + 单位 + reviews" 格式
    match = linkText.match(/([\d,.]+)([KkMm]?)\s*(?:customer\s+)?reviews?/i);
    if (match && match[1]) {
      let value = parseFloat(match[1].replace(/,/g, ''));
      const unit = match[2]?.toUpperCase();
      
      if (unit === 'K') {
        value *= 1000;
      } else if (unit === 'M') {
        value *= 1000000;
      }
      
      const num = Math.floor(value);
      if (!isNaN(num) && num > 0) {
        return num;
      }
    }
    
    // 方法4: 提取第一个找到的数字（兜底）
    const cleaned = linkText.replace(/,/g, '');
    match = cleaned.match(/([\d.]+)([KkMm]?)/);
    if (match && match[1]) {
      let value = parseFloat(match[1]);
      const unit = match[2]?.toUpperCase();
      
      if (unit === 'K') {
        value *= 1000;
      } else if (unit === 'M') {
        value *= 1000000;
      }
      
      const num = Math.floor(value);
      // 只有当数字合理时才返回（1-10000000范围内）
      if (!isNaN(num) && num > 0 && num <= 10000000) {
        return num;
      }
    }
    
    return null;
  } catch (error) {
    console.error('从链接提取评论数失败:', error);
    return null;
  }
}

