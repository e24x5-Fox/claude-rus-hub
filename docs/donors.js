/* Донатеры для виджета слева: пишет tools/donors_snapshot.py из GitHub
   Actions по списку донатов DonationAlerts. Ник, сумма и последнее сообщение.
   Без ключа DA_TOKEN скрипт файл не трогает — тогда его можно вести руками. */
window.CRH_DONORS = {
 "updated": "2026-10-03T16:40Z",
 "rules": {
  "base_days": 7,
  "rub_per_day": 10,
  "msg_max": 200,
  "name_max": 32,
  "since": "2026-09-20"
 },
 "donors": [
  {
   "name": "Жопич",
   "amount": 100,
   "currency": "RUB",
   "message": "Горгонзолла",
   "until": "2026-10-20"
  }
 ]
};
