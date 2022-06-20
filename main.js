var calendar_name = PropertiesService.getScriptProperties().getProperty("calendar_name");
var weekday = ["日", "月", "火", "水", "木", "金", "土"];

// 通知時間指定のためのトリガーを起動
function setTrigger(){

  // 通知時刻
  const time = new Date();
  time.setHours(16);
  time.setMinutes(0);
  
  ScriptApp.newTrigger('notifyTodayEvents').timeBased().at(time).create();
}

// 使用済みのトリガーを削除 
function delTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  
  for(const trigger of triggers){
    if(trigger.getHandlerFunction() == "notifyTodayEvents") ScriptApp.deleteTrigger(trigger);
  }
}

// Main
function notifyTodayEvents() {
  delTrigger();
  
  var todayEvents = JSON.parse(timetreeGetUpcomingEventsByName(calendar_name)).data;
  var message = "\n明日の予定です。\n\n" + createMessage(todayEvents);

  sendMessageToLine(message);
}

// 通知用のメッセージ作成
function createMessage(events) {
  var message = '';
  var eventsSize = events.length;

  if (eventsSize === 0) {
    return message += "明日の予定はありません。やったね！"
  }

  events.forEach(function(event, index) {
    if (checkDate(new Date(event.attributes.start_at))) {
      var allDay = event.attributes.all_day;
      var title = "🗓️" + event.attributes.title;
      var description = event.attributes.description;
    
      if (description === null) description = "メモはありません。";
    
      description = "📝" + description;
    
      if (allDay) {
        var date = "⏰" + formatDate(new Date(event.attributes.start_at), 1);
        message += title + "\n" + date + "\n" + description;
      } else {
        var startAt = "⏰" + formatDate(new Date(event.attributes.start_at), 2);
        var endAt = formatDate(new Date(event.attributes.end_at), 2);
        message += title + "\n" + startAt + ' - ' + endAt + "\n" + description;
      }
   
      if (index < eventsSize - 1) message += "\n\n";
    }
    
    else return true;
  });

  return message;
}

function checkDate(date) {
  //今日の日付
  var nowDate = new Date();
  var nowDate_str = Utilities.formatDate(nowDate, 'JST', 'MM/dd');
  
  // 予定の日付
  var nextDate_str = Utilities.formatDate(date, 'JST', 'MM/dd');
  
  // 当日の予定は通知しない
  if (nowDate_str === nextDate_str) return false;
  
  else return true;
}

function formatDate(date, op) {
  if (op == 1) {
    return Utilities.formatDate(date, 'JST', 'MM/dd(' + weekday[date.getDay()] + ') 終日');
  } else if (op == 2) {
    return Utilities.formatDate(date, 'JST', 'MM/dd(' + weekday[date.getDay()] + ') HH:mm');
  }
}

// ===== TimeTree API ======
// TimeTree用の処理
function timetreeGetUpcomingEventsByName(name) {
  var id = timetreeGetCalendarIdByName(name);
  return timetreeGetUpcomingEvents(id);
}

// 当日以降の予定を取得(翌日のみ)
function timetreeGetUpcomingEvents(id) {
  var url = 'https://timetreeapis.com/calendars/' + id + '/upcoming_events?timezone=Asia/Tokyo&days=2';
  var method = 'GET'; 
  var payload = '';
  return timetreeAPI(url, method, payload);
}

// カレンダー情報の取得
function timetreeGetCalendars() {
  var url = 'https://timetreeapis.com/calendars';
  var method = 'GET';
  var payload = '';
  return timetreeAPI(url, method, payload);
}

// カレンダー一覧から特定のカレンダーのみを取得する
function timetreeGetCalendarIdByName(name) {
  var response = timetreeGetCalendars();
  var calendars = JSON.parse(response).data;

  var calendar = calendars.filter(function(data){
    return data.attributes.name.toString() === name;
  });
  return calendar[0].id;
}

// TimeTree API
function timetreeAPI(url, method, payload) {
  var accessToken = PropertiesService.getScriptProperties().getProperty('timetree_personal_access_token');
  var headers = {
    'Authorization': 'Bearer '+ accessToken
  };
  var options = {
    'method': method,
    'headers': headers,
    'payload': payload
  };

  return UrlFetchApp.fetch(url, options);
}


// ===== LINE Notify API ======

// LINE Notify APIを通して予定を通知
function sendMessageToLine(message) {
  var url = 'https://notify-api.line.me/api/notify';
  var payload = "message=" + message;
  lineNotifyAPI(url, 'post', payload);
}

// LINE Notify API
function lineNotifyAPI(url, method, payload){
  var accessToken = PropertiesService.getScriptProperties().getProperty('line_notify_access_token');
  var headers = {
   'Authorization': 'Bearer '+ accessToken
  };
  var options = {
     "method": method,
     "headers": headers,
     "payload": payload
  };

  return UrlFetchApp.fetch(url, options);
}
