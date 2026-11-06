import unittest,compatibility
class CompatibilityTest(unittest.TestCase):
    def setUp(self):
        self.games=[dict(slug='lucidcheats',release=dict(tag_prefix='lucidcheats-'))]
        self.records={'other':dict(build='1',broken=False)}
    def test_confirm_keeps_other_games(self):
        compatibility.record(self.games,self.records,'lucidcheats','2644','1.0.2','Запуск проверен',tag='lucidcheats-v1.0.2')
        self.assertEqual(self.records['lucidcheats']['build'],'2644')
        self.assertFalse(self.records['lucidcheats']['broken'])
        self.assertIn('other',self.records)
    def test_exact_build_and_known_game_required(self):
        for slug,build in [('unknown','2644'),('lucidcheats','latest')]:
            with self.assertRaises(ValueError):compatibility.record(self.games,self.records,slug,build,'1','Проверен')
    def test_broken_can_be_recorded_and_cleared(self):
        compatibility.record(self.games,self.records,'lucidcheats','2644','1','Ошибка',broken=True)
        self.assertTrue(self.records['lucidcheats']['broken'])
        compatibility.record(self.games,self.records,'lucidcheats','2644','2','Исправлено')
        self.assertFalse(self.records['lucidcheats']['broken'])
    def test_wrong_release_rejected(self):
        with self.assertRaises(ValueError):compatibility.record(self.games,self.records,'lucidcheats','2644','1','Проверен',tag='dragnwash-v1')
if __name__=='__main__':unittest.main()
