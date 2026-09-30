"""Один раз получить ключ API DonationAlerts для списка донатеров.

Ссылка на виджет оповещений (widget/alerts?token=…) для этого не годится:
её токен — для OBS, списка донатов по нему не получить, а светить его нельзя.
Нужно своё приложение DonationAlerts и ключ с правом читать донаты.

1. https://www.donationalerts.com/application/clients → «Создать новое
   приложение». Название любое, Redirect URL — адрес каталога:
       https://e24x5-fox.github.io/claude-rus-hub/
2. python tools/donors_token.py <ID приложения>
   Откроется страница DonationAlerts: «Разрешить». Браузер уйдёт на каталог,
   а в адресной строке после # будет access_token=… — скопируйте адрес
   целиком и вставьте сюда.
3. Скрипт покажет ключ и, если есть gh, положит его в секрет DA_TOKEN.

Ключ даёт только чтение донатов (scope oauth-donation-index).
"""
import sys, shutil, subprocess, webbrowser, urllib.parse

REDIRECT = "https://e24x5-fox.github.io/claude-rus-hub/"
REPO = "e24x5-Fox/claude-rus-hub"


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    url = "https://www.donationalerts.com/oauth/authorize?" + urllib.parse.urlencode({
        "client_id": sys.argv[1], "redirect_uri": REDIRECT,
        "response_type": "token", "scope": "oauth-donation-index"})
    print("Открываю:", url)
    webbrowser.open(url)

    back = input("\nАдрес, на который вернул браузер: ").strip()
    frag = urllib.parse.parse_qs(urllib.parse.urlsplit(back).fragment)
    token = (frag.get("access_token") or [""])[0]
    if not token:
        raise SystemExit("В адресе нет access_token — скопируйте его целиком, вместе с частью после #")
    days = int((frag.get("expires_in") or ["0"])[0]) // 86400
    print("\nКлюч получен" + (", действует ~%d дн." % days if days else "") + ("" if days else "."))

    if shutil.which("gh"):
        subprocess.run(["gh", "secret", "set", "DA_TOKEN", "-R", REPO], input=token.encode(), check=True)
        print("Записан в секрет DA_TOKEN репозитория", REPO)
    else:
        print("gh не найден. Положите ключ руками: Settings → Secrets → Actions → DA_TOKEN\n")
        print(token)


if __name__ == "__main__":
    main()
