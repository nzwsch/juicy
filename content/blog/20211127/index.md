---
title: "ActiveStorageでRSpecのtips"
date: "2021-11-27T14:17:31.312+09:00"
description: "fixture_file_uploadや空の動画ファイルを生成する方法など"
---

最近ちゃんとRSpecを書いていないなぁと思うことが多く、ついつい後回しにしがちなテスト。
TDDを意識して書いていきたいところですが、今回はファイルのアップロードまわりで知見がたまってきたのでまとめて公開します。

### ほぼ空のビデオファイルを作成する

自作のRailsアプリケーションで動画ファイルのアップロード機能を実装するとき[Sample Videos][sample-videos]で公開されているファイルも最低1MBからなのでGitにコミットすることがはばかれます。
そこでFFmpegを使ってほぼ空のビデオファイルを作成できます。

    ffmpeg -f lavfi -i color=size=10x10:rate=25:color=black -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 -t 1 output.mp4

ちなみにこのときのファイルサイズは`3.6 kB`でした。

    $ stat output.mp4 | grep Size:
      Size: 3555      	Blocks: 8          IO Block: 4096   regular file

https://stackoverflow.com/a/46370114

[sample-videos]: https://sample-videos.com/

### ほぼ空の画像を作成する

画像ファイル程度ならGitのコミット特に影響はないと思いますが、念の為。

    convert -size 1x1 xc:white white.png

このときのファイルサイズは`258 bytes`でした。

    $ stat white.png | grep Size:
      Size: 258       	Blocks: 8          IO Block: 4096   regular file

https://stackoverflow.com/a/39504523

### 空のバイナリを作成する

上記の方法を調べていた後に判明したのですが、Railsの[`fixture_file_upload`][fixture_file_upload]は上記のような方法を使わなくても影響がなさそうなので、空のテキストファイルは`touch`などでも作れますが、空のバイナリファイルを作る方法も調べておきます。

    dd if=/dev/zero of=binary.dat bs=1c count=1

https://stackoverflow.com/a/8831573

[fixture_file_upload]: https://edgeapi.rubyonrails.org/classes/ActionDispatch/TestProcess/FixtureFile.html

### FactoryGirl(FactoryBot)で`file_fixture`を使えるようにする

```ruby
FactoryBot.define do
  factory :article do
    title { 'test' }
    image { Rack::Test::UploadedFile.new(Rails.root.join('spec/fixtures/dummy.jpg'), 'image/png') } # too bad!
  end
end
```

今回の本題なのですが、上記のダミーファイルを使って`factory`を定義しようとすると動きはするのですがやたら長ったらしくて見苦しいです。
本来RSpecには[`file_fixture`][file_fixture]というメソッドが定義されているため理想としては:

```ruby
FactoryBot.define do
  factory :article do
    title { 'test' }
    image { file_fixture('dummy.png', 'image/png') } # neat!
  end
end
```

ただし`factory`には`file_fixture`が定義されていないためこのままだと当然`NoMethodError`が返ってきてしまいます。

https://github.com/thoughtbot/factory_bot/issues/1282#issuecomment-659707488

ありがたいことに作りかけのPRではあるものの、コードが共有されていたのでこちらを組み込んでみましょう。

```ruby
module FactoryBot
  class << self
    def file_fixture_path
      Rails.root.join("spec", "fixtures")
    end
  end

  class Evaluator
    def file_fixture(filename, mime_type = nil, binary = false)
      if FactoryBot.file_fixture_path.present?
        path = Pathname.new(File.join(FactoryBot.file_fixture_path, filename))

        if path.exist?
          Rack::Test::UploadedFile.new(path, mime_type, binary)
        else
          msg = "the directory '%s' does not contain a file named '%s'"
          Kernel.raise ArgumentError, msg % [file_fixture_path, filename]
        end
      else
        Kernel.raise "to use the file_fixture helper you must set FactoryBot.file_fixture_path='path/to/fixture_files'"
      end
    end
  end
end
```

これで無事テストが動くようになりました。

[file_fixture]: https://relishapp.com/rspec/rspec-rails/docs/file-fixture
