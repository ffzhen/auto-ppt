// 简单的API测试脚本
const fetch = require('node-fetch');

const API_URL = 'http://localhost:8080/api';

async function testAPI() {
  try {
    // 创建演示文稿
    console.log('创建演示文稿...');
    const createResponse = await fetch(`${API_URL}/presentations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '测试演示文稿',
        viewportRatio: 0.625 // 16:10 比例
      })
    });
    
    const presentation = await createResponse.json();
    console.log('创建成功:', presentation);
    
    // 获取所有演示文稿
    console.log('\n获取所有演示文稿...');
    const getAllResponse = await fetch(`${API_URL}/presentations`);
    const presentations = await getAllResponse.json();
    console.log('所有演示文稿:', presentations);
    
    // 获取单个演示文稿
    console.log(`\n获取演示文稿 ID ${presentation.id}...`);
    const getOneResponse = await fetch(`${API_URL}/presentations/${presentation.id}`);
    const singlePresentation = await getOneResponse.json();
    console.log('单个演示文稿:', singlePresentation);
    
    // 更新演示文稿
    console.log(`\n更新演示文稿 ID ${presentation.id}...`);
    const updateResponse = await fetch(`${API_URL}/presentations/${presentation.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '已更新的演示文稿',
      })
    });
    const updatedPresentation = await updateResponse.json();
    console.log('更新后的演示文稿:', updatedPresentation);
    
    // 克隆演示文稿
    console.log(`\n克隆演示文稿 ID ${presentation.id}...`);
    const cloneResponse = await fetch(`${API_URL}/presentations/${presentation.id}/clone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '克隆的演示文稿',
      })
    });
    const clonedPresentation = await cloneResponse.json();
    console.log('克隆的演示文稿:', clonedPresentation);
    
    console.log('\n测试完成！所有API调用成功。');
    
  } catch (error) {
    console.error('API测试失败:', error);
  }
}

testAPI(); 