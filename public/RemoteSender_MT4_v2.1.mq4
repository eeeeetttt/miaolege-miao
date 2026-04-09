//+------------------------------------------------------------------+
//|                                               RemoteSender_MT4.mq4 |
//|                                    远程跟单发射端 (MT4版本)       |
//|                                 监控主账户交易信号并发送至API      |
//+------------------------------------------------------------------+
#property copyright "远程跟单发射端 (MT4)"
#property version   "2.1"
#property description "监控主账户的交易信号，通过HTTP发送至跟单服务器"
#property strict

// 输入参数
string ApiBaseURL = "https://gvbn6hx95b.coze.site";   // 您的网站地址
string SenderAccountID = "";                           // 发射端账户标识（留空自动使用MT4登录号）
string EquityReportKey = "ea_equity_report_secure_key_2024"; // 净值上报API密钥
int EquityReportInterval = 60;                          // 净值上报间隔（秒），建议60秒
bool ShowPanel = true;
int PanelCorner = 1;                                   // 0-左上,1-右上,2-左下,3-右下

// 全局变量
string accountID;
int lastSignalCount = 0;
datetime lastSendTime = 0;
string lastError = "";
int lastProcessedTicket = 0;
datetime lastEquityReport = 0;
double lastReportedEquity = 0;

// 记录已发送信号的订单（开仓和平仓）
int sentOpenTickets[];               // 已发送开仓信号的订单号
int sentCloseTickets[];              // 已发送平仓信号的订单号

// 面板对象名称
string panelName = "SenderPanel";
string lblStatus, lblAccount, lblBalance, lblEquity, lblSignals, lblLastSend, lblPositions, lblError;

// 空数据数组（用于GET请求）
uchar emptyData[];

//+------------------------------------------------------------------+
//| 初始化函数                                                       |
//+------------------------------------------------------------------+
int OnInit()
{
    // 获取账户标识
    accountID = (SenderAccountID == "") ? IntegerToString(AccountNumber()) : SenderAccountID;
    string serverName = AccountServer();
    Print("账户服务器：", serverName);

    // 初始化已发送信号数组
    ArrayResize(sentOpenTickets, 0);
    ArrayResize(sentCloseTickets, 0);

    // 设置定时器用于定期上报净值（每EquityReportInterval秒）
    EventSetTimer(EquityReportInterval);
    
    // 启动时立即上报一次净值
    ReportEquity();

    if(ShowPanel) CreatePanel();
    Print("发射端EA启动 (MT4 v2.1)，账户：", accountID, " 目标API：", ApiBaseURL);
    Print("净值上报间隔：", EquityReportInterval, "秒");
    return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| 反初始化函数                                                     |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
    EventKillTimer();
    if(ShowPanel)
        ObjectsDeleteAll(0, panelName);
}

//+------------------------------------------------------------------+
//| 定时器函数（用于定期上报净值）                                   |
//+------------------------------------------------------------------+
void OnTimer()
{
    ReportEquity();
}

//+------------------------------------------------------------------+
//| Tick函数（轮询监控）                                             |
//+------------------------------------------------------------------+
void OnTick()
{
    // 1. 检测新开仓订单
    CheckNewOrders();
    // 2. 检测已平仓订单
    CheckClosedOrders();
    // 3. 更新面板
    if(ShowPanel) UpdatePanel();
}

//+------------------------------------------------------------------+
//| 上报净值数据到API                                               |
//+------------------------------------------------------------------+
void ReportEquity()
{
    datetime currentTime = TimeCurrent();
    
    // 获取账户信息
    double balance = AccountBalance();
    double equity = AccountEquity();
    double profit = equity - balance;  // 浮动盈亏 = 净值 - 余额
    
    // 检查净值是否有变化（避免无意义的上报）
    if(MathAbs(equity - lastReportedEquity) < 0.01 && lastReportedEquity > 0)
    {
        // 净值变化小于0.01，跳过上报（可选）
        // 如果需要每次都上报，注释掉下面这段
        // Print("净值无变化，跳过上报");
        // return;
    }
    
    // 构建JSON
    string json = StringFormat(
        "{"
        "\"accountNumber\":\"%s\","
        "\"equity\":%.2f,"
        "\"balance\":%.2f,"
        "\"profit\":%.2f,"
        "\"apiKey\":\"%s\""
        "}",
        accountID, equity, balance, profit, EquityReportKey
    );

    string url = ApiBaseURL + "/api/equity/report";
    uchar postData[];
    StringToCharArray(json, postData, 0, WHOLE_ARRAY);
    int dataSize = ArraySize(postData);
    if(dataSize > 0 && postData[dataSize-1] == 0)
        ArrayResize(postData, dataSize-1);

    uchar response[];
    string resultHeaders;
    string headers = "Content-Type: application/json\r\n";

    Print("ReportEquity: POST URL=", url);
    Print("ReportEquity: 请求数据=", json);
    
    int res = WebRequest("POST", url, headers, 5000, postData, response, resultHeaders);
    string responseStr = CharArrayToString(response);
    Print("ReportEquity: 返回码=", res);
    Print("ReportEquity: 响应内容=", responseStr);

    if(res == 200)
    {
        lastReportedEquity = equity;
        lastEquityReport = currentTime;
        Print("净值上报成功：净值=", equity, " 余额=", balance, " 盈亏=", profit);
    }
    else
    {
        Print("净值上报失败，错误码：", res);
    }
}

//+------------------------------------------------------------------+
//| 检测新开仓订单（未平仓订单中新增的）                             |
//+------------------------------------------------------------------+
void CheckNewOrders()
{
    int total = OrdersTotal();
    for(int i = 0; i < total; i++)
    {
        if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES))
            continue;

        int ticket = OrderTicket();
        int orderType = OrderType();

        // 仅关注市价单（开仓成交的订单）
        if(orderType == OP_BUY || orderType == OP_SELL)
        {
            // 检查是否已经发送过开仓信号
            if(!IsTicketInArray(sentOpenTickets, ticket))
            {
                // 新开仓，发送OPEN信号
                string symbol = OrderSymbol();
                double volume = OrderLots();
                double price = OrderOpenPrice();
                double sl = OrderStopLoss();
                double tp = OrderTakeProfit();
                string typeStr = (orderType == OP_BUY) ? "BUY" : "SELL";

                SendSignal("OPEN", ticket, symbol, typeStr, volume, price, sl, tp, 0.0);

                // 记录已发送
                AddToArray(sentOpenTickets, ticket);
                break; // 一次Tick只处理一个新订单，避免重复请求
            }
        }
    }
}

//+------------------------------------------------------------------+
//| 检测已平仓订单（历史订单中刚刚关闭的）                           |
//+------------------------------------------------------------------+
void CheckClosedOrders()
{
    int total = OrdersHistoryTotal();
    datetime currentTime = TimeCurrent();

    for(int i = 0; i < total; i++)
    {
        if(!OrderSelect(i, SELECT_BY_POS, MODE_HISTORY))
            continue;

        int ticket = OrderTicket();
        int orderType = OrderType();

        // 仅处理市价单（平仓的是之前开仓的单子）
        if(orderType == OP_BUY || orderType == OP_SELL)
        {
            datetime closeTime = OrderCloseTime();
            // 如果平仓时间距离当前时间小于2秒（刚平仓）且未发送过平仓信号
            if(closeTime > 0 && (currentTime - closeTime) <= 2 && !IsTicketInArray(sentCloseTickets, ticket))
            {
                // 获取平仓详细信息
                string symbol = OrderSymbol();
                double volume = OrderLots();
                double closePrice = OrderClosePrice();
                string direction = (orderType == OP_BUY) ? "BUY" : "SELL";
                double profit = OrderProfit() + OrderSwap(); // 总利润（含掉期）

                // 发送平仓信号
                SendSignal("CLOSE", ticket, symbol, direction, volume, closePrice, 0, 0, profit);

                // 记录已发送
                AddToArray(sentCloseTickets, ticket);
                break; // 一次Tick只处理一个平仓订单
            }
        }
    }
}

//+------------------------------------------------------------------+
//| 检查订单号是否已在数组中                                         |
//+------------------------------------------------------------------+
bool IsTicketInArray(int &arr[], int ticket)
{
    int size = ArraySize(arr);
    for(int i = 0; i < size; i++)
        if(arr[i] == ticket)
            return true;
    return false;
}

//+------------------------------------------------------------------+
//| 向数组添加订单号                                                 |
//+------------------------------------------------------------------+
void AddToArray(int &arr[], int ticket)
{
    int size = ArraySize(arr);
    ArrayResize(arr, size + 1);
    arr[size] = ticket;
}

//+------------------------------------------------------------------+
//| 发送信号到网站API                                                |
//+------------------------------------------------------------------+
void SendSignal(string signalType, int ticket, string symbol, string orderType,
                double volume, double price, double sl, double tp, double dealProfit)
{
    // 获取服务器名称（作为broker字段）和账户余额
    string broker = AccountServer();
    double balance = AccountBalance();

    // 构建JSON
    string json = StringFormat(
        "{"
        "\"signal_type\":\"%s\","
        "\"ticket\":%d,"
        "\"symbol\":\"%s\","
        "\"order_type\":\"%s\","
        "\"volume\":%.2f,"
        "\"price\":%.5f,"
        "\"sl\":%.5f,"
        "\"tp\":%.5f,"
        "\"deal_profit\":%.2f,"
        "\"sender_account\":\"%s\","
        "\"broker\":\"%s\","
        "\"balance\":%.2f"
        "}",
        signalType, ticket, symbol, orderType, volume, price, sl, tp, dealProfit,
        accountID, broker, balance
    );

    string url = ApiBaseURL + "/api/signal/receive";
    uchar postData[];
    StringToCharArray(json, postData, 0, WHOLE_ARRAY);
    int dataSize = ArraySize(postData);
    if(dataSize > 0 && postData[dataSize-1] == 0)
        ArrayResize(postData, dataSize-1);

    uchar response[];
    string resultHeaders;
    string headers = "Content-Type: application/json\r\n";

    Print("SendSignal: POST URL=", url);
    Print("SendSignal: 请求数据=", json);
    int res = WebRequest("POST", url, headers, 5000, postData, response, resultHeaders);
    Print("SendSignal: 返回码=", res);
    Print("SendSignal: 响应内容=", CharArrayToString(response));

    if(res == 200 || res == 201)
    {
        lastSignalCount++;
        lastSendTime = TimeCurrent();
        lastError = "";
        Print("信号发送成功：", signalType, " 订单#", ticket);
        
        // 每次交易后立即上报一次净值（确保净值及时更新）
        ReportEquity();
    }
    else
    {
        lastError = "HTTP Error: " + IntegerToString(res);
        Print("信号发送失败，错误码：", res);
    }
}

//+------------------------------------------------------------------+
//| 创建可视化面板                                                   |
//+------------------------------------------------------------------+
void CreatePanel()
{
    long chartWidth = ChartGetInteger(0, CHART_WIDTH_IN_PIXELS);
    long chartHeight = ChartGetInteger(0, CHART_HEIGHT_IN_PIXELS);
    int x = (PanelCorner == 0 || PanelCorner == 2) ? 10 : (int)chartWidth - 280;
    int y = (PanelCorner == 0 || PanelCorner == 1) ? 20 : (int)chartHeight - 220;

    ObjectCreate(0, panelName + "_BG", OBJ_RECTANGLE_LABEL, 0, 0, 0);
    ObjectSetInteger(0, panelName + "_BG", OBJPROP_XDISTANCE, x);
    ObjectSetInteger(0, panelName + "_BG", OBJPROP_YDISTANCE, y);
    ObjectSetInteger(0, panelName + "_BG", OBJPROP_XSIZE, 260);
    ObjectSetInteger(0, panelName + "_BG", OBJPROP_YSIZE, 200);
    ObjectSetInteger(0, panelName + "_BG", OBJPROP_BGCOLOR, clrBlack);
    ObjectSetInteger(0, panelName + "_BG", OBJPROP_BORDER_TYPE, BORDER_FLAT);
    ObjectSetInteger(0, panelName + "_BG", OBJPROP_COLOR, clrGray);

    CreateLabel("Title", x+5, y+5, "远程跟单发射端 v2.1", clrYellow);
    lblStatus = CreateLabel("Status", x+5, y+25, "API: 检测中...", clrWhite);
    lblAccount = CreateLabel("Account", x+5, y+42, "账户: " + accountID, clrWhite);
    lblBalance = CreateLabel("Balance", x+5, y+59, "余额: --", clrWhite);
    lblEquity = CreateLabel("Equity", x+5, y+76, "净值: --", clrLime);
    lblSignals = CreateLabel("Signals", x+5, y+93, "已发信号: 0", clrWhite);
    lblLastSend = CreateLabel("LastSend", x+5, y+110, "最后发送: --", clrWhite);
    lblPositions = CreateLabel("Positions", x+5, y+127, "持仓: 0", clrWhite);
    lblError = CreateLabel("Error", x+5, y+144, "错误: --", clrRed);
    CreateLabel("EquityReport", x+5, y+161, "净值上报: 间隔" + IntegerToString(EquityReportInterval) + "秒", clrAqua);
}

//+------------------------------------------------------------------+
//| 创建标签辅助函数                                                 |
//+------------------------------------------------------------------+
string CreateLabel(string name, int x, int y, string text, color clr)
{
    string objName = panelName + "_" + name;
    ObjectCreate(0, objName, OBJ_LABEL, 0, 0, 0);
    ObjectSetInteger(0, objName, OBJPROP_XDISTANCE, x);
    ObjectSetInteger(0, objName, OBJPROP_YDISTANCE, y);
    ObjectSetString(0, objName, OBJPROP_TEXT, text);
    ObjectSetInteger(0, objName, OBJPROP_COLOR, clr);
    ObjectSetInteger(0, objName, OBJPROP_FONTSIZE, 8);
    ObjectSetInteger(0, objName, OBJPROP_CORNER, 0);
    return objName;
}

//+------------------------------------------------------------------+
//| 更新面板                                                         |
//+------------------------------------------------------------------+
void UpdatePanel()
{
    if(!ShowPanel) return;

    double balance = AccountBalance();
    double equity = AccountEquity();
    double profit = equity - balance;
    
    ObjectSetString(0, lblBalance, OBJPROP_TEXT, "余额: " + DoubleToString(balance, 2) + " USD");
    ObjectSetString(0, lblEquity, OBJPROP_TEXT, "净值: " + DoubleToString(equity, 2) + " USD (" + (profit >= 0 ? "+" : "") + DoubleToString(profit, 2) + ")");
    ObjectSetString(0, lblSignals, OBJPROP_TEXT, "已发信号: " + IntegerToString(lastSignalCount));
    if(lastSendTime > 0)
        ObjectSetString(0, lblLastSend, OBJPROP_TEXT, "最后发送: " + TimeToString(lastSendTime, TIME_MINUTES));

    int positions = OrdersTotal();
    ObjectSetString(0, lblPositions, OBJPROP_TEXT, "持仓: " + IntegerToString(positions));

    if(lastError != "")
        ObjectSetString(0, lblError, OBJPROP_TEXT, "错误: " + lastError);
    else
        ObjectSetString(0, lblError, OBJPROP_TEXT, "错误: --");

    // 简单检测API连接（每分钟一次）
    static datetime lastCheck = 0;
    if(TimeCurrent() - lastCheck > 60)
    {
        lastCheck = TimeCurrent();
        string url = ApiBaseURL;
        string headers = "";
        uchar response[];
        string resultHeaders;
        int res = WebRequest("GET", url, headers, 3000, emptyData, response, resultHeaders);
        if(res == 200)
            ObjectSetString(0, lblStatus, OBJPROP_TEXT, "API: ✅ 已连接");
        else
            ObjectSetString(0, lblStatus, OBJPROP_TEXT, "API: ❌ 连接失败");
    }
}
//+------------------------------------------------------------------+
