import { chromium, Browser, Page } from 'playwright';
import { parseSearchResults, parseMonthSales, extractReviewsFromLink } from './data-parser';
import type { FilterConditions } from './types';

export interface ScraperResult {
  searchResults: number | null;
  maxMonthSales: number | null;
  maxReviews: number | null;
  error?: string;
  duration?: number;
}

/**
 * 搜索Amazon关键词并提取数据
 */
export async function searchAmazonKeyword(
  keyword: string,
  zipCode: string,
  filters: FilterConditions,
  headless: boolean = true
): Promise<ScraperResult> {
  const startTime = Date.now();
  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    console.log(`\n========== 搜索: ${keyword} ==========`);
    
    // 启动浏览器
    // 使用环境变量指定的 Chromium 路径，如果未设置则使用默认路径
    const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined;
    
    browser = await chromium.launch({
      headless,
      executablePath,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
      ],
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'en-US',
      timezoneId: 'America/New_York',
    });

    page = await context.newPage();

    // 访问Amazon首页
    try {
      await page.goto('https://www.amazon.com/', { 
        waitUntil: 'load',
        timeout: 30000 
      });
    } catch (e: any) {
      console.error('✗ 无法访问Amazon:', e.message);
      try {
        const screenshotPath = `debug-goto-failed-${Date.now()}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`截图已保存: ${screenshotPath}`);
      } catch (screenshotError) {
        // 忽略截图错误
      }
      throw new Error(`无法访问Amazon: ${e.message}`);
    }

    // 等待页面加载完成
    await page.waitForTimeout(2000);

    // 尝试关闭可能出现的弹窗
    try {
      const continueButton = page.getByRole('button', { name: 'Continue shopping' });
      if (await continueButton.isVisible({ timeout: 3000 })) {
        await continueButton.click();
        await page.waitForTimeout(500);
        // 点击页面其他区域关闭弹窗
        await page.locator('html').click();
        await page.waitForTimeout(1000);
      }
    } catch (e) {
      // 弹窗不存在，继续
    }

    // 设置邮编（如果提供了邮编）
    if (zipCode && zipCode.trim()) {
      try {
        await page.getByRole('button', { name: /Delivering to/i }).click({ timeout: 5000 });
        await page.waitForTimeout(1000);
        
        const zipInput = page.getByRole('textbox', { name: /or enter a US zip code/i });
        await zipInput.click();
        await zipInput.fill(zipCode);
        await page.waitForTimeout(500);
        
        await page.getByLabel('Apply').click();
        await page.waitForTimeout(1000);
        
        await page.getByRole('button', { name: 'Done' }).click();
        await page.waitForTimeout(1000);
      } catch (e) {
        console.error('设置邮编失败:', e);
        // 继续执行，邮编设置失败不致命
      }
    } else {
      console.log('邮编为空，跳过邮编设置');
    }

    // 搜索关键词 - 使用多种选择器尝试
    let searchBox;
    
    try {
      // 尝试方法1: 通过ARIA role
      searchBox = page.getByRole('searchbox', { name: 'Search Amazon' });
      await searchBox.waitFor({ timeout: 5000 });
    } catch (e) {
      try {
        // 尝试方法2: 通过ID
        searchBox = page.locator('#twotabsearchtextbox');
        await searchBox.waitFor({ timeout: 5000 });
      } catch (e2) {
        try {
          // 尝试方法3: 通过name属性
          searchBox = page.locator('input[name="field-keywords"]');
          await searchBox.waitFor({ timeout: 5000 });
        } catch (e3) {
          try {
            // 尝试方法4: 通用搜索框选择器
            searchBox = page.locator('input[type="text"][placeholder*="Search"]').first();
            await searchBox.waitFor({ timeout: 5000 });
          } catch (e4) {
            // 所有方法都失败，保存截图
            const screenshotPath = `debug-${Date.now()}.png`;
            await page.screenshot({ path: screenshotPath, fullPage: true });
            console.error(`✗ 无法找到搜索框，截图: ${screenshotPath}`);
            throw new Error('无法找到搜索框');
          }
        }
      }
    }

    // 点击搜索框并输入
    await searchBox.click({ timeout: 10000 });
    await page.waitForTimeout(500);
    await searchBox.fill(keyword);
    await page.waitForTimeout(800);
    
    // 点击Go按钮进行搜索
    try {
      const goButton = page.getByRole('button', { name: 'Go', exact: true });
      await goButton.waitFor({ timeout: 3000 });
      await goButton.click();
    } catch (e) {
      console.log('未找到Go按钮，尝试备用方法');
      try {
        // 尝试通过ID找到Go按钮
        const goBtn = page.locator('#nav-search-submit-button');
        await goBtn.click();
      } catch (e2) {
        // 如果都找不到，使用回车键
        console.log('使用回车键搜索');
        await page.keyboard.press('Enter');
      }
    }
    
    // 等待搜索结果加载
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // 提取数据
    const result: ScraperResult = {
      searchResults: null,
      maxMonthSales: null,
      maxReviews: null,
    };

    // 1. 先提取搜索结果数
    try {
      const resultsText = await page.locator('div.s-breadcrumb, div.a-section.a-spacing-small.a-spacing-top-small, span.rush-component').first().textContent({ timeout: 5000 });
      if (resultsText) {
        result.searchResults = parseSearchResults(resultsText);
      }
    } catch (e) {
      // 静默失败
    }

    const duration = Date.now() - startTime;
    console.log(`📊 搜索结果数: ${result.searchResults ? result.searchResults.toLocaleString() : '未找到'}`);

    // 2. 检查搜索结果数是否符合条件
    if (result.searchResults === null || result.searchResults >= filters.maxSearchResults) {
      console.log(`❌ 搜索结果数不符合条件（需要 < ${filters.maxSearchResults}），跳过月销和评论检查`);
      console.log(`⏱️  耗时: ${(duration / 1000).toFixed(2)}秒`);
      console.log(`=========================================\n`);
      return { ...result, duration };
    }

    console.log(`✓ 搜索结果数符合条件，开始查找月销量最高的产品...`);

    // 3. 搜索结果数符合，找到月销量最高的产品及其评论数
    try {
      const productCards = await page.locator('div[data-component-type="s-search-result"]').all();
      console.log(`共 ${productCards.length} 个产品卡片`);
      
      let maxSales = 0;
      let maxSalesProductName = '';
      let maxSalesProductReviews: number | null = null;
      
      for (const card of productCards) {
        try {
          // 提取月销量
          let sales: number | null = null;
          try {
            const salesText = await card.locator('span:has-text("bought in past month")').first().textContent({ timeout: 500 });
            if (salesText) {
              sales = parseMonthSales(salesText);
            }
          } catch (e) {
            // 该产品没有月销量
          }

          // 如果当前产品的月销量更高，记录该产品的所有信息
          if (sales && sales > maxSales) {
            maxSales = sales;
            
            // 获取产品名称 - 尝试多种选择器
            maxSalesProductName = '';
            try {
              // 方法1: h2 a span
              let nameElement = await card.locator('h2 a span').first().textContent({ timeout: 1000 });
              if (nameElement && nameElement.trim()) {
                maxSalesProductName = nameElement.trim();
                console.log(`[调试] 方法1找到产品名: "${maxSalesProductName.substring(0, 50)}..."`);
              }
            } catch (e) {
              // 方法1失败，尝试方法2
              try {
                // 方法2: h2 span
                let nameElement = await card.locator('h2 span').first().textContent({ timeout: 1000 });
                if (nameElement && nameElement.trim()) {
                  maxSalesProductName = nameElement.trim();
                  console.log(`[调试] 方法2找到产品名: "${maxSalesProductName.substring(0, 50)}..."`);
                }
              } catch (e2) {
                // 方法2失败，尝试方法3
                try {
                  // 方法3: h2
                  let nameElement = await card.locator('h2').first().textContent({ timeout: 1000 });
                  if (nameElement && nameElement.trim()) {
                    maxSalesProductName = nameElement.trim();
                    console.log(`[调试] 方法3找到产品名: "${maxSalesProductName.substring(0, 50)}..."`);
                  }
                } catch (e3) {
                  console.log('[调试] 所有方法都无法找到产品名');
                  maxSalesProductName = '';
                }
              }
            }

            // 获取该产品的评论数
            maxSalesProductReviews = null;
            try {
              let reviewText = null;
              
              try {
                // 查找带有 s-underline-text class 的 span 元素
                reviewText = await card.locator('span.s-underline-text').first().textContent({ timeout: 500 });
              } catch (e) {
                // 方法1失败，尝试通过 aria-hidden 属性查找
                try {
                  const spans = await card.locator('span[aria-hidden="true"]').all();
                  for (const span of spans) {
                    const text = await span.textContent({ timeout: 500 });
                    // 查找包含括号的文本，例如 "(983)" 或 "(36.1K)"
                    if (text && text.match(/^\([\d,.]+[KkMm]?\)$/)) {
                      reviewText = text;
                      break;
                    }
                  }
                } catch (e2) {
                  // 方法2也失败
                }
              }
              
              if (reviewText) {
                maxSalesProductReviews = extractReviewsFromLink(reviewText);
              }
            } catch (e) {
              // 该产品没有评论
            }
          }
        } catch (e) {
          // 该产品处理失败，继续下一个
        }
      }

      result.maxMonthSales = maxSales > 0 ? maxSales : null;
      result.maxReviews = maxSalesProductReviews;

      console.log('\n--- 月销量最高的产品 ---');
      if (maxSales > 0) {
        console.log(`📦 月销量: ${maxSales.toLocaleString()}`);
        console.log(`📝 产品标题: ${maxSalesProductName}`);
        console.log(`⭐ 该产品评论数: ${maxSalesProductReviews ? maxSalesProductReviews.toLocaleString() : '未找到'}`);
      } else {
        console.log(`📦 未找到有月销量的产品`);
      }
      console.log('------------------------');
      
    } catch (e) {
      console.error('遍历产品时出错:', e);
    }
    
    console.log(`⏱️  耗时: ${(duration / 1000).toFixed(2)}秒`);
    console.log(`=========================================\n`);
    
    return { ...result, duration };

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`✗ 搜索失败: ${error.message} (耗时: ${(duration / 1000).toFixed(2)}秒)`);
    
    // 尝试保存错误截图
    if (page) {
      try {
        const screenshotPath = `debug-error-${Date.now()}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`截图: ${screenshotPath}`);
      } catch (screenshotError) {
        // 忽略
      }
    }
    
    return {
      searchResults: null,
      maxMonthSales: null,
      maxReviews: null,
      error: error.message || '未知错误',
      duration,
    };
  } finally {
    // 清理资源
    if (page) {
      await page.close().catch(() => {});
    }
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

