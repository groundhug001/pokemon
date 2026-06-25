# Google Apps Script 設置指南

此指南說明如何將寶可夢資料保存到 Google Sheets。

## 步驟 1: 建立 Google Sheet

1. 前往 [Google Sheets](https://sheets.google.com)
2. 建立新的試算表，命名為「寶可夢資料庫」或任何你喜歡的名稱
3. 建立以下欄位（第 1 列）：
   - A: 編號 (id)
   - B: 英文名稱 (pokemon)
   - C: 中文名稱 (chineseName)
   - D: 屬性 (types)
   - E: 技能 (moves)
   - F: 進化型 (evolution)
   - G: 時間戳 (timestamp)

## 步驟 2: 建立 Apps Script

1. 在 Google Sheets 中，點擊「擴充功能」> 「Apps Script」
2. 刪除預設的代碼，複製下面的代碼：

```javascript
function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const data = JSON.parse(e.postData.contents);
    
    // 準備要插入的資料行
    const row = [
      data.id,
      data.pokemon,
      data.chineseName,
      data.types,
      data.moves,
      data.evolution,
      data.timestamp
    ];
    
    // 追加到試算表
    sheet.appendRow(row);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: '寶可夢資料已保存'
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
```

## 步驟 3: 部署 Apps Script

1. 在 Apps Script 編輯器中，點擊「部署」> 「新部署」
2. 選擇部署類型為「網路應用」
3. 「作為」選擇你的 Google 帳戶
4. 「執行身份為」選擇你的帳戶
5. 「誰可以存取」選擇「任何人」
6. 點擊「部署」
7. 複製生成的部署 URL（會是類似 `https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/useless/doPost` 的格式）

## 步驟 4: 在應用中設置網址

1. 回到寶可夢查詢頁面
2. 在「Google Apps Script 網址」欄位中貼上部署 URL
3. 查詢寶可夢時，會出現「保存到 Google Sheets」按鈕
4. 點擊該按鈕即可將寶可夢資料保存到你的 Google Sheet

## 注意事項

- 確保 Google Sheet 的第一列有正確的欄位標題
- Apps Script 部署網址需要設置為「任何人」才能接收來自網站的請求
- 資料會按照查詢順序新增到試算表

## 更新部署 URL（如果需要）

如果你的 Apps Script 代碼有更新：
1. 在 Apps Script 編輯器中修改代碼
2. 點擊「部署」> 「管理部署」
3. 編輯現有部署或建立新部署
4. 複製新的部署 URL（通常保持不變）
