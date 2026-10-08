/* Музыка для плеера в левом углу (music-widget.js). Треки автора, сделаны в Suno.
   Добавить трек — положить music/<имя>.mp3 и обложку music/<имя>.jpg (256×256)
   и дописать строку сюда. suno — id трека из ссылки suno.com/song/<id>
   (она же в метаданных mp3, поле WOAS): по ней название ведёт на Suno.
   mp3 — 128 кбит/с, чтобы страница не тяжелела. После этого — кадры анимации
   плеера: python tools/music_viz.py (посчитает music/<имя>.viz для новых mp3), а если в треке
   поют — слова для сцены: python tools/music_lyrics.py --fetch (music/<имя>.lyr). */
window.CRH_MUSIC = {
  artist: 'e24x5',
  tracks: [
    { title: 'phonk & phonk',         file: 'phonk-and-phonk',       suno: '6fe02274-5bb0-41cc-85bd-ebed36d7ce8d' },
    { title: 'Poka Ty Spih',          file: 'poka-ty-spih',          suno: 'ddf5cd96-9b89-43bf-a0c7-b1883799ff31' },
    { title: 'POTA',                  file: 'pota',                  suno: 'afd0d192-415c-4a58-9569-494510ad5e76' },
    { title: 'Bezlikiy',              file: 'bezlikiy',              suno: 'af7806c1-c60d-41a5-bafa-403644bd1276' },
    { title: 'TRISTE RAPOSA',         file: 'triste-raposa',         suno: '918525ee-dc7c-415d-a4ee-9cb226f166cf' },
    { title: 'Zabud Moe Imya',        file: 'zabud-moe-imya',        suno: 'dac2b310-ec80-4cc6-92b5-4ace68668f85' },
    { title: 'BODYCAM',               file: 'bodycam',               suno: 'f6e6fff6-f3ce-412b-85f5-02ce2062ea9c' },
    { title: 'Where have you gone?',  file: 'where-have-you-gone',   suno: '4cbe68a0-038b-453d-b70e-e0182c032a06' },
    { title: 'Неон в тишине',         file: 'neon-v-tishine',        suno: '99695b57-db7a-456b-af54-43a366e86b17' },
    { title: 'Razbityy bit',          file: 'razbityy-bit',          suno: '5763c6bd-6291-4d42-84a0-38e9bbe49b09' },
    { title: 'Pixel Phonk',           file: 'pixel-phonk',           suno: '57cf14aa-723d-49d4-87b3-68e8632bce5d' },
    { title: 'Never',                 file: 'never',                 suno: 'e2a63393-d8c2-4ef3-af69-d3099a8b86b1' },
    { title: 'spim_v_meste',          file: 'spim-v-meste',          suno: '23749328-52fc-4716-9674-8102834284a4' },
    { title: 'Pust begut neuklyuzhe', file: 'pust-begut-neuklyuzhe', suno: '1fb494e9-3a29-4201-9848-d4c14d1cc187' },
    { title: 'Cursed Digicore',       file: 'cursed-digicore',       suno: 'dd0df79f-9303-4809-833d-53cb0c60f21b' }
  ]
};
