"""Record a tested Steam build, manually or from a release compatibility.json.

python tools/compatibility.py --slug lucidcheats --build 123 --version 1.0.1 --note "запуск проверен"
python tools/compatibility.py --release release.json --receipt compatibility.json
No Steam build is guessed from a publication date.
"""
from pathlib import Path
import argparse, datetime, json, re

ROOT = Path(__file__).resolve().parents[1]

def read_js(file, name):
    text = file.read_text(encoding='utf8')
    return json.loads(re.search(r'window\.' + name + r'\s*=\s*(\{[\s\S]*\})\s*;', text)[1])

def record(games, all_verified, slug, build, version, note, tag=None, broken=False):
    game = next((g for g in games if g['slug'] == slug), None)
    if not game: raise ValueError('Неизвестная игра: ' + slug)
    if not re.fullmatch(r'[0-9]+', str(build)): raise ValueError('Нужен точный Steam buildid')
    if not version or not note.strip(): raise ValueError('Укажите версию и результат проверки')
    if tag and not tag.startswith(game['release']['tag_prefix']): raise ValueError('Тег относится к другой игре')
    value = dict(build=str(build), at=datetime.date.today().isoformat(),
                 by=note.strip(), broken=broken, version=version)
    if tag: value['release_tag'] = tag
    all_verified[slug] = value
    return value

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--slug'); p.add_argument('--build'); p.add_argument('--version');p.add_argument('--note')
    p.add_argument('--broken',action='store_true');p.add_argument('--release');p.add_argument('--receipt')
    a=p.parse_args()
    file=ROOT/'docs/verified.js';games=read_js(ROOT/'docs/games.js','CATALOG')['games']
    all_verified=read_js(file,'CRH_VERIFIED')
    if a.release:
        rel=json.loads(Path(a.release).read_text(encoding='utf8'))
        if rel.get('draft') or rel.get('prerelease'): raise ValueError('Нужен опубликованный стабильный релиз')
        receipt=json.loads(Path(a.receipt).read_text(encoding='utf8'))
        if receipt.get('schema') != 1 or receipt.get('verified') is not True: raise ValueError('Нет подтверждения проверки')
        game=next(g for g in games if g['slug']==receipt['slug'])
        assets={x['name']:x for x in rel.get('assets',[])}
        if game['release']['asset'] not in assets: raise ValueError('В релизе нет установщика игры')
        asset=assets[game['release']['asset']]
        if receipt.get('installer') != asset['name']: raise ValueError('Запись относится к другому установщику')
        if not re.fullmatch('[a-f0-9]{64}',receipt.get('sha256','')): raise ValueError('Нет SHA256 проверенного установщика')
        if asset.get('digest') and asset['digest'] != 'sha256:'+receipt['sha256']: raise ValueError('Установщик отличается от проверенного')
        tag=rel['tag_name'];version=receipt['version']
        if tag[len(game['release']['tag_prefix']):].lstrip('v') != version: raise ValueError('Версия записи не совпадает с тегом')
        value=record(games,all_verified,receipt['slug'],receipt['build'],version,receipt['note'],tag=tag)
    else:
        value=record(games,all_verified,a.slug,a.build,a.version,a.note or '',broken=a.broken)
    header=file.read_text(encoding='utf8').split('window.CRH_VERIFIED')[0]
    file.write_text(header+'window.CRH_VERIFIED = '+json.dumps(all_verified,ensure_ascii=False,indent=1)+';\n',encoding='utf8')
    print(json.dumps(value,ensure_ascii=False))

if __name__=='__main__':main()
