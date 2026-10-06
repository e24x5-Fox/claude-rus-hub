/* Музыка для плеера в левом углу (music-widget.js). Треки автора, сделаны в Suno.
   Добавить трек — положить music/<имя>.mp3 и обложку music/<имя>.jpg (256×256)
   и дописать строку сюда. suno — id трека из ссылки suno.com/song/<id>
   (она же в метаданных mp3, поле WOAS): по ней название ведёт на Suno.
   mp3 — 128 кбит/с, чтобы страница не тяжелела. */
window.CRH_MUSIC = {
  artist: 'e24x5',
  tracks: [
    { title: 'phonk & phonk',  file: 'phonk-and-phonk', suno: '6fe02274-5bb0-41cc-85bd-ebed36d7ce8d' },
    { title: 'Poka Ty Spih',   file: 'poka-ty-spih',    suno: 'ddf5cd96-9b89-43bf-a0c7-b1883799ff31' },
    { title: 'POTA',           file: 'pota',            suno: 'afd0d192-415c-4a58-9569-494510ad5e76' },
    { title: 'Bezlikiy',       file: 'bezlikiy',        suno: 'af7806c1-c60d-41a5-bafa-403644bd1276' },
    { title: 'TRISTE RAPOSA',  file: 'triste-raposa',   suno: '918525ee-dc7c-415d-a4ee-9cb226f166cf' },
    { title: 'Zabud Moe Imya', file: 'zabud-moe-imya',  suno: 'dac2b310-ec80-4cc6-92b5-4ace68668f85' }
  ]
};
