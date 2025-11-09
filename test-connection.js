/**
 * 测试Amazon连接和Playwright配置
 * 运行: node test-connection.js
 */

const { chromium } = require('playwright');

async function testConnection() {
  console.log('\n========== Amazon连接测试 ==========\n');
  
  let browser = null;
  let page = null;
  
  try {
    // 1. 测试浏览器启动
    console.log('1. 启动浏览器...');
    browser = await chromium.launch({
      headless: false, // 显示浏览器窗口
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
      ],
    });
    console.log('   ✓ 浏览器启动成功\n');
    
    // 2. 创建页面
    console.log('2. 创建新页面...');
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'en-US',
      timezoneId: 'America/New_York',
    });
    page = await context.newPage();
    console.log('   ✓ 页面创建成功\n');
    
    // 3. 测试访问Amazon（使用load策略）
    console.log('3. 访问Amazon.com (使用load策略)...');
    const startTime = Date.now();
    await page.goto('https://www.amazon.com/', { 
      waitUntil: 'load',
      timeout: 30000 
    });
    const loadTime = Date.now() - startTime;
    console.log(`   ✓ 页面加载成功 (耗时: ${loadTime}ms)\n`);
    
    // 4. 检查页面信息
    console.log('4. 页面信息:');
    console.log(`   标题: ${await page.title()}`);
    console.log(`   URL: ${page.url()}\n`);
    
    // 5. 等待一下让页面完全加载
    console.log('5. 等待页面完全加载...');
    await page.waitForTimeout(3000);
    console.log('   ✓ 等待完成\n');
    
    // 6. 查找搜索框
    console.log('6. 查找搜索框...');
    
    // 尝试方法1: ARIA role
    try {
      const searchBox1 = page.getByRole('searchbox', { name: 'Search Amazon' });
      await searchBox1.waitFor({ timeout: 5000 });
      console.log('   ✓ 方法1成功: ARIA role');
    } catch (e) {
      console.log('   ✗ 方法1失败: ARIA role');
    }
    
    // 尝试方法2: ID
    try {
      const searchBox2 = page.locator('#twotabsearchtextbox');
      await searchBox2.waitFor({ timeout: 5000 });
      console.log('   ✓ 方法2成功: ID #twotabsearchtextbox');
    } catch (e) {
      console.log('   ✗ 方法2失败: ID');
    }
    
    // 尝试方法3: name属性
    try {
      const searchBox3 = page.locator('input[name="field-keywords"]');
      await searchBox3.waitFor({ timeout: 5000 });
      console.log('   ✓ 方法3成功: name属性');
    } catch (e) {
      console.log('   ✗ 方法3失败: name属性');
    }
    
    console.log('\n7. 保存测试截图...');
    await page.screenshot({ path: 'test-screenshot.png', fullPage: false });
    console.log('   ✓ 截图已保存: test-screenshot.png\n');
    
    console.log('========================================');
    console.log('✅ 所有测试通过！');
    console.log('========================================\n');
    
    // 等待5秒让你查看浏览器
    console.log('浏览器将在5秒后关闭...');
    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.error('\n❌ 测试失败:');
    console.error(`   错误: ${error.message}\n`);
    
    // 尝试保存错误截图
    if (page) {
      try {
        await page.screenshot({ path: 'test-error.png', fullPage: true });
        console.log('错误截图已保存: test-error.png\n');
      } catch (e) {
        console.error('无法保存截图:', e.message);
      }
    }
  } finally {
    // 清理
    if (page) await page.close().catch(console.error);
    if (browser) await browser.close().catch(console.error);
  }
}

// 运行测试
testConnection().catch(console.error);

