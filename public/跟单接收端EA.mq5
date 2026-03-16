//+------------------------------------------------------------------+
//|                                          跟单接收端EA.mq5         |
//|                                    MLGM星球跟单平台              |
//|                                    https://mlgm.coze.site        |
//+------------------------------------------------------------------+
#property copyright "MLGM星球跟单平台"
#property link      "https://mlgm.coze.site"
#property version   "1.00"
#property strict

#include <Trade\Trade.mqh>
#include <Trade\Position.mqh>
#include <Trade\SymbolInfo.mqh>

//+------------------------------------------------------------------+
//| 输入参数                                                          |
//+------------------------------------------------------------------+
input string   ServerURL = "https://gvbn6hx95b.coze.site";  // 服务器地址
input double   FixedLot = 0.01;                              // 固定跟单手数
input int      PollInterval = 3;                             // 轮询间隔(秒)
input int      MaxRetry = 3;                                 // 最大重试次数
input int      Slippage = 3;                                 // 允许滑点
input bool     EnableLog = true;                             // 启用日志

//+------------------------------------------------------------------+
//| 全局变量                                                          |
//+------------------------------------------------------------------+
CTrade         trade;
CPositionInfo  positionInfo;
CSymbolInfo    symbolInfo;

string         g_userId = "";           // 用户ID
int            g_planetId = 0;          // 星球ID
long           g_lastSignalId = 0;      // 最后处理的信号ID
string         g_mtAccount = "";        // 当前MT账户
bool           g_isRunning = false;     // EA运行状态
datetime       g_lastPollTime = 0;      // 上次轮询时间

// 订单映射: 信号源ticket -> 跟单账户ticket
class COrderMap : public CHashMap<long, ulong>
{
};

COrderMap g_orderMap;

//+------------------------------------------------------------------+
//| Expert initialization function                                    |
//+------------------------------------------------------------------+
int OnInit()
{
   // 设置交易参数
   trade.SetExpertMagicNumber(888888);
   trade.SetDeviationInPoints(Slippage);
   trade.SetTypeFilling(ORDER_FILLING_IOC);
   
   // 获取当前账户
   g_mtAccount = IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN));
   
   Print("===========================================");
   Print("MLGM星球跟单接收端EA v1.0 启动");
   Print("跟单账户: ", g_mtAccount);
   Print("服务器: ", ServerURL);
   Print("===========================================");
   
   // 验证跟单权限
   if(!ValidatePurchase())
   {
      Print("账号 ", g_mtAccount, " 没有有效的跟单服务，EA将停止运行");
      return INIT_FAILED;
   }
   
   Print("验证通过，开始跟单服务");
   Print("用户ID: ", g_userId);
   Print("星球ID: ", g_planetId);
   
   g_isRunning = true;
   
   return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                  |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   g_isRunning = false;
   Print("MLGM跟单EA已停止运行");
}

//+------------------------------------------------------------------+
//| Expert tick function                                              |
//+------------------------------------------------------------------+
void OnTick()
{
   if(!g_isRunning) return;
   
   // 检查是否到达轮询时间
   datetime currentTime = TimeCurrent();
   if(currentTime - g_lastPollTime < PollInterval)
      return;
   
   g_lastPollTime = currentTime;
   
   // 轮询新信号
   PollSignals();
}

//+------------------------------------------------------------------+
//| 验证购买权限                                                       |
//+------------------------------------------------------------------+
bool ValidatePurchase()
{
   string url = ServerURL + "/api/purchase/validate?followAccount=" + g_mtAccount;
   
   LogPrint("验证购买: GET URL=" + url);
   
   char response[];
   string responseHeaders;
   int timeout = 10000;
   
   int retryCount = 0;
   int res = -1;
   
   while(retryCount < MaxRetry)
   {
      res = WebRequest("GET", url, NULL, timeout, response, responseHeaders);
      
      if(res != -1)
         break;
      
      retryCount++;
      Sleep(1000);
   }
   
   LogPrint("验证购买返回码=" + IntegerToString(res));
   
   if(res == -1)
   {
      LogPrint("网络请求失败，请检查网络连接");
      return false;
   }
   
   string responseText = CharArrayToString(response, 0, WHOLE_ARRAY, CP_UTF8);
   LogPrint("验证购买响应=" + responseText);
   
   // 解析JSON响应
   if(!ParseValidationResponse(responseText))
   {
      LogPrint("响应解析失败");
      return false;
   }
   
   return true;
}

//+------------------------------------------------------------------+
//| 解析验证响应                                                       |
//+------------------------------------------------------------------+
bool ParseValidationResponse(string response)
{
   // 简单JSON解析（避免依赖外部库）
   
   // 检查 hasPurchase 字段
   int hasPurchasePos = StringFind(response, "\"hasPurchase\":");
   if(hasPurchasePos == -1)
   {
      LogPrint("响应中未找到 hasPurchase 字段");
      return false;
   }
   
   string hasPurchaseStr = StringSubstr(response, hasPurchasePos + 14, 10);
   bool hasPurchase = (StringFind(hasPurchaseStr, "true") != -1);
   
   if(!hasPurchase)
   {
      LogPrint("响应中 hasPurchase 不为 true");
      return false;
   }
   
   // 提取 userId
   int userIdPos = StringFind(response, "\"userId\":");
   if(userIdPos != -1)
   {
      int start = StringFind(response, "\"", userIdPos + 9);
      int end = StringFind(response, "\"", start + 1);
      if(start != -1 && end != -1)
      {
         g_userId = StringSubstr(response, start + 1, end - start - 1);
      }
   }
   
   // 提取 planetId
   int planetIdPos = StringFind(response, "\"planetId\":");
   if(planetIdPos != -1)
   {
      int start = planetIdPos + 11;
      int end = StringFind(response, ",", start);
      if(end == -1) end = StringFind(response, "}", start);
      if(end != -1)
      {
         g_planetId = (int)StringToInteger(StringSubstr(response, start, end - start));
      }
   }
   
   return true;
}

//+------------------------------------------------------------------+
//| 轮询信号                                                          |
//+------------------------------------------------------------------+
void PollSignals()
{
   if(g_userId == "" || g_planetId == 0)
   {
      LogPrint("用户信息不完整，跳过轮询");
      return;
   }
   
   string url = ServerURL + "/api/signals/poll?userId=" + g_userId + 
                "&planetId=" + IntegerToString(g_planetId) +
                "&limit=20";
   
   if(g_lastSignalId > 0)
   {
      url += "&lastSignalId=" + IntegerToString(g_lastSignalId);
   }
   
   char response[];
   string responseHeaders;
   int timeout = 10000;
   
   int res = WebRequest("GET", url, NULL, timeout, response, responseHeaders);
   
   if(res == -1)
   {
      LogPrint("信号轮询失败");
      return;
   }
   
   string responseText = CharArrayToString(response, 0, WHOLE_ARRAY, CP_UTF8);
   
   // 解析并处理信号
   ProcessSignals(responseText);
}

//+------------------------------------------------------------------+
//| 处理信号                                                          |
//+------------------------------------------------------------------+
void ProcessSignals(string response)
{
   // 查找 signals 数组
   int signalsPos = StringFind(response, "\"signals\":");
   if(signalsPos == -1) return;
   
   int arrayStart = StringFind(response, "[", signalsPos);
   if(arrayStart == -1) return;
   
   // 逐个提取信号对象
   int searchPos = arrayStart + 1;
   int signalCount = 0;
   
   while(true)
   {
      int objStart = StringFind(response, "{", searchPos);
      if(objStart == -1) break;
      
      // 找到匹配的 }
      int braceCount = 1;
      int objEnd = objStart + 1;
      while(braceCount > 0 && objEnd < StringLen(response))
      {
         string ch = StringSubstr(response, objEnd, 1);
         if(ch == "{") braceCount++;
         else if(ch == "}") braceCount--;
         objEnd++;
      }
      
      string signalJson = StringSubstr(response, objStart, objEnd - objStart);
      
      // 处理单个信号
      ProcessSingleSignal(signalJson);
      signalCount++;
      
      searchPos = objEnd;
   }
   
   if(signalCount > 0)
   {
      LogPrint("处理了 " + IntegerToString(signalCount) + " 个信号");
   }
}

//+------------------------------------------------------------------+
//| 处理单个信号                                                       |
//+------------------------------------------------------------------+
void ProcessSingleSignal(string json)
{
   // 提取信号字段
   long signalId = GetJsonLong(json, "id");
   string signalType = GetJsonString(json, "signalType");
   string symbol = GetJsonString(json, "symbol");
   long sourceTicket = GetJsonLong(json, "ticket");
   double volume = GetJsonDouble(json, "volume");
   double price = GetJsonDouble(json, "price");
   double sl = GetJsonDouble(json, "sl");
   double tp = GetJsonDouble(json, "tp");
   
   if(signalId <= g_lastSignalId)
      return;  // 已处理过
   
   LogPrint("-------------------------------------------");
   LogPrint("收到信号 ID=" + IntegerToString(signalId));
   LogPrint("信号类型: " + signalType + " 品种: " + symbol);
   
   // 处理不同信号类型
   if(signalType == "OPEN_BUY" || signalType == "open_buy")
   {
      OpenPosition(symbol, ORDER_TYPE_BUY, volume, price, sl, tp, sourceTicket, signalId);
   }
   else if(signalType == "OPEN_SELL" || signalType == "open_sell")
   {
      OpenPosition(symbol, ORDER_TYPE_SELL, volume, price, sl, tp, sourceTicket, signalId);
   }
   else if(signalType == "CLOSE_BUY" || signalType == "close_buy")
   {
      ClosePosition(symbol, ORDER_TYPE_BUY, sourceTicket, signalId);
   }
   else if(signalType == "CLOSE_SELL" || signalType == "close_sell")
   {
      ClosePosition(symbol, ORDER_TYPE_SELL, sourceTicket, signalId);
   }
   else if(signalType == "MODIFY" || signalType == "modify")
   {
      ModifyPosition(symbol, sl, tp, sourceTicket, signalId);
   }
   
   // 更新最后处理的信号ID
   g_lastSignalId = signalId;
}

//+------------------------------------------------------------------+
//| 开仓                                                              |
//+------------------------------------------------------------------+
bool OpenPosition(string symbol, ENUM_ORDER_TYPE orderType, double volume, 
                  double price, double sl, double tp, long sourceTicket, long signalId)
{
   // 检查品种是否存在
   if(!SymbolSelect(symbol, true))
   {
      LogPrint("品种 " + symbol + " 不存在");
      return false;
   }
   
   // 初始化品种信息
   if(!symbolInfo.Name(symbol))
   {
      LogPrint("无法获取品种信息: " + symbol);
      return false;
   }
   
   symbolInfo.RefreshRates();
   symbolInfo.Refresh();
   
   // 使用固定手数
   double lotSize = FixedLot;
   if(lotSize <= 0) lotSize = symbolInfo.LotsMin();
   
   // 检查手数范围
   if(lotSize < symbolInfo.LotsMin()) lotSize = symbolInfo.LotsMin();
   if(lotSize > symbolInfo.LotsMax()) lotSize = symbolInfo.LotsMax();
   
   // 根据步进调整手数
   double lotStep = symbolInfo.LotsStep();
   lotSize = MathFloor(lotSize / lotStep) * lotStep;
   
   // 获取当前价格
   double ask = symbolInfo.Ask();
   double bid = symbolInfo.Bid();
   double currentPrice = (orderType == ORDER_TYPE_BUY) ? ask : bid;
   
   // 规范化价格
   int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
   double normalizedPrice = NormalizeDouble(currentPrice, digits);
   
   string orderComment = "MLGM_" + IntegerToString(signalId);
   
   bool result = false;
   
   if(orderType == ORDER_TYPE_BUY)
   {
      result = trade.Buy(lotSize, symbol, normalizedPrice, sl, tp, orderComment);
      
      if(result)
      {
         ulong orderTicket = trade.ResultOrder();
         LogPrint("开多仓成功: ", symbol, " 手数=", DoubleToString(lotSize, 2), 
                  " 价格=", DoubleToString(normalizedPrice, digits),
                  " 止损=", DoubleToString(sl, digits),
                  " 止盈=", DoubleToString(tp, digits),
                  " Ticket=", IntegerToString(orderTicket));
         
         // 保存订单映射
         g_orderMap.Add(sourceTicket, orderTicket);
      }
      else
      {
         LogPrint("开多仓失败: ", trade.ResultRetcode(), " ", trade.ResultRetcodeDescription());
      }
   }
   else
   {
      result = trade.Sell(lotSize, symbol, normalizedPrice, sl, tp, orderComment);
      
      if(result)
      {
         ulong orderTicket = trade.ResultOrder();
         LogPrint("开空仓成功: ", symbol, " 手数=", DoubleToString(lotSize, 2),
                  " 价格=", DoubleToString(normalizedPrice, digits),
                  " 止损=", DoubleToString(sl, digits),
                  " 止盈=", DoubleToString(tp, digits),
                  " Ticket=", IntegerToString(orderTicket));
         
         // 保存订单映射
         g_orderMap.Add(sourceTicket, orderTicket);
      }
      else
      {
         LogPrint("开空仓失败: ", trade.ResultRetcode(), " ", trade.ResultRetcodeDescription());
      }
   }
   
   return result;
}

//+------------------------------------------------------------------+
//| 平仓                                                              |
//+------------------------------------------------------------------+
bool ClosePosition(string symbol, ENUM_ORDER_TYPE orderType, long sourceTicket, long signalId)
{
   ulong followTicket = 0;
   
   // 通过映射查找跟单订单
   if(g_orderMap.TryGetValue(sourceTicket, followTicket))
   {
      // 找到映射订单
      if(PositionSelectByTicket(followTicket))
      {
         bool result = trade.PositionClose(followTicket);
         
         if(result)
         {
            LogPrint("平仓成功: ", symbol, " Ticket=", IntegerToString(followTicket));
            g_orderMap.Remove(sourceTicket);
            return true;
         }
         else
         {
            LogPrint("平仓失败: ", trade.ResultRetcode(), " ", trade.ResultRetcodeDescription());
         }
      }
   }
   
   // 映射未找到，按品种+方向查找
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0) continue;
      
      if(PositionGetString(POSITION_SYMBOL) == symbol)
      {
         ENUM_POSITION_TYPE posType = (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
         
         if((orderType == ORDER_TYPE_BUY && posType == POSITION_TYPE_BUY) ||
            (orderType == ORDER_TYPE_SELL && posType == POSITION_TYPE_SELL))
         {
            string comment = PositionGetString(POSITION_COMMENT);
            if(StringFind(comment, "MLGM_") == 0)
            {
               bool result = trade.PositionClose(ticket);
               
               if(result)
               {
                  LogPrint("平仓成功(按品种): ", symbol, " Ticket=", IntegerToString(ticket));
                  return true;
               }
            }
         }
      }
   }
   
   LogPrint("未找到需要平仓的订单: ", symbol);
   return false;
}

//+------------------------------------------------------------------+
//| 修改订单                                                          |
//+------------------------------------------------------------------+
bool ModifyPosition(string symbol, double sl, double tp, long sourceTicket, long signalId)
{
   ulong followTicket = 0;
   
   // 通过映射查找
   if(g_orderMap.TryGetValue(sourceTicket, followTicket))
   {
      if(PositionSelectByTicket(followTicket))
      {
         bool result = trade.PositionModify(followTicket, sl, tp);
         
         if(result)
         {
            LogPrint("修改订单成功: Ticket=", IntegerToString(followTicket),
                     " 止损=", DoubleToString(sl, 5),
                     " 止盈=", DoubleToString(tp, 5));
            return true;
         }
         else
         {
            LogPrint("修改订单失败: ", trade.ResultRetcode());
         }
      }
   }
   
   return false;
}

//+------------------------------------------------------------------+
//| JSON解析辅助函数                                                   |
//+------------------------------------------------------------------+
string GetJsonString(string json, string key)
{
   string searchKey = "\"" + key + "\":";
   int pos = StringFind(json, searchKey);
   if(pos == -1) return "";
   
   int start = StringFind(json, "\"", pos + StringLen(searchKey));
   if(start == -1) return "";
   
   int end = StringFind(json, "\"", start + 1);
   if(end == -1) return "";
   
   return StringSubstr(json, start + 1, end - start - 1);
}

long GetJsonLong(string json, string key)
{
   string searchKey = "\"" + key + "\":";
   int pos = StringFind(json, searchKey);
   if(pos == -1) return 0;
   
   int start = pos + StringLen(searchKey);
   
   // 跳过空格
   while(start < StringLen(json) && StringSubstr(json, start, 1) == " ")
      start++;
   
   int end = start;
   while(end < StringLen(json))
   {
      string ch = StringSubstr(json, end, 1);
      if(ch == "," || ch == "}" || ch == "]" || ch == " ")
         break;
      end++;
   }
   
   string valueStr = StringSubstr(json, start, end - start);
   return StringToInteger(valueStr);
}

double GetJsonDouble(string json, string key)
{
   string searchKey = "\"" + key + "\":";
   int pos = StringFind(json, searchKey);
   if(pos == -1) return 0.0;
   
   int start = pos + StringLen(searchKey);
   
   // 跳过空格
   while(start < StringLen(json) && StringSubstr(json, start, 1) == " ")
      start++;
   
   int end = start;
   while(end < StringLen(json))
   {
      string ch = StringSubstr(json, end, 1);
      if(ch == "," || ch == "}" || ch == "]" || ch == " ")
         break;
      end++;
   }
   
   string valueStr = StringSubstr(json, start, end - start);
   return StringToDouble(valueStr);
}

//+------------------------------------------------------------------+
//| 日志输出                                                          |
//+------------------------------------------------------------------+
void LogPrint(string message)
{
   if(EnableLog)
   {
      Print(message);
   }
}

//+------------------------------------------------------------------+
//| 定时器事件（可选，用于心跳检测）                                    |
//+------------------------------------------------------------------+
void OnTimer()
{
   // 可选：定期检查连接状态
}

//+------------------------------------------------------------------+
