---
title: "Railsで動画を分析する"
date: "2021-09-12T12:40:01.458+09:00"
description: "ActiveStorageを使った動画の長さとサムネイルの生成の方法"
---

ひとくちにファイルのアップロードを扱うgemにも[Shrine][shrine]や[Carrierwave][carrierwave]などがありますが、今回はActiveStorageで動画の長さと動画のサムネイル画像を生成してみることにします。

ActiveStorageも出始めの頃は情報も少なくできることが少ないものだと思っていましたが、プロトタイプを作る意味では最も簡単に使えると思います。
[Active Storage Overview][rails-guides]を読んでいると:

> Video analysis provides these, as well as duration, angle, and display_aspect_ratio.

動画ファイルでは縦横のサイズに加えて、長さや縦横比が取得できるようです。

```yaml
test:
  service: Disk
  root: <%= Rails.root.join("tmp/storage") %>
  analyzed: true

local:
  service: Disk
  root: <%= Rails.root.join("storage") %>
  analyzed: true
```

ガイドによれば`analyzed`を追記すればよいので
とはいえこの情報だけでは圧倒的に足りないのでここではもう少し踏み込んでみようと思います。

https://github.com/rails/rails/blob/6-1-stable/activestorage/lib/active_storage/analyzer/video_analyzer.rb

```ruby
module ActiveStorage
  class Analyzer::VideoAnalyzer < Analyzer
    def ffprobe_path
      ActiveStorage.paths[:ffprobe] || "ffprobe"
    end
  end
end
```

探してみると`ActiveStorage::Analyzer::VideoAnalyzer`というクラスが見つかりました。
このファイルによるとFFmpegの`ffprobe`を使うようです。
[Alpine Linux][alpine]だと`apk add ffmpeg`でコマンドが使えるようになりました。

では実際に[Sample Videos][sample-videos]のファイルを借りて試してみましょう。

    [ActiveJob] Enqueued ActiveStorage::AnalyzeJob (Job ID: 2d53f9b3-dc4b-4883-963d-0910e1cf606f) to Async(default) with arguments: #<GlobalID:0x00007f0b3e034080 @uri=#<URI::GID gid://myapp/ActiveStorage::Blob/1>>
    [ActiveJob] [ActiveStorage::AnalyzeJob] [2d53f9b3-dc4b-4883-963d-0910e1cf606f]   ActiveStorage::Blob Update (0.7ms)  UPDATE "active_storage_blobs" SET "metadata" = $1 WHERE "active_storage_blobs"."id" = $2  [["metadata", "{\"identified\":true,\"width\":1280.0,\"height\":720.0,\"duration\":5.28,\"display_aspect_ratio\":[16,9],\"analyzed\":true}"], ["id", 1]]

ログを見ると`ActiveStorage::AnalyzeJob`というジョブが実行されていました。
縦横1280x720px(16:9)で長さが5.28秒として取得できていました。

注意としてはSeedで作成したファイルは`ActiveStorage::AnalyzeJob`が実行されなかったので、個別にJobを実行してあげる必要がありそうです。

続いてこの動画のサムネイルを表示してみます。
まずは今回定義したモデルの`Video`です。

```ruby
class Video < ApplicationRecord
  has_one_attached :content
end
```

Viewに関してはこの通りです。
初回表示に時間がかかってしまうのですが、イメージとしては`ffmpeg`を実行して`image_processing`というgemでリサイズをします。
今回はGraphicsMagickを使用しましたが、サポートしているライブラリであればどれでもよいと思います。

```erb
<%= image_tag video.content.preview(resize_to_limit: [348, 225]) %>
```

![SampleVideo_1280x720_1mb](./SampleVideo_1280x720_1mb.jpg)

これで生成された画像がご覧の通り。
ただしこのサムネイルはもともと問題なく表示できているのですが、白黒の画面からフェードインだったりする場合はうまくサムネイルが表示できないことがあるかもしれません。

https://github.com/rails/rails/blob/6-1-stable/activestorage/lib/active_storage/previewer/video_previewer.rb

```ruby
module ActiveStorage
  class Previewer::VideoPreviewer < Previewer
    private
      def draw_relevant_frame_from(file, &block)
        draw self.class.ffmpeg_path, "-i", file.path, *Shellwords.split(ActiveStorage.video_preview_arguments), "-", &block
      end
  end
end
```

今度は`ActiveStorage::Previewer::VideoPreviewer`を見ていると、実際にコマンドを実行していると思しき箇所が見つかりました。
ちょうど`ActiveStorage.video_preview_arguments`というものがあり、調べてみるとさらに次のファイルを見つけました。

> `config.active_storage.video_preview_arguments` can be used to alter the way ffmpeg generates video preview images.
> The default is `"-y -vframes 1 -f image2"`

Rails Consoleでも同様に確認できました。

    Loading development environment (Rails 6.1.4.1)
    irb(main):001:0> ActiveStorage.video_preview_arguments
    => "-y -vframes 1 -f image2"

もとの動画が5秒なので、今回は3秒後で指定してみます。

```ruby
config.active_storage.video_preview_arguments = "-y -vframes 1 -f image2 -ss 3"
```

![SampleVideo_1280x720_1mb_2](./SampleVideo_1280x720_1mb_2.jpg)

先ほどとは違ったシーンの画像が生成できました。
理想としては`ffprobe`で動画ごとの長さを取得して半分くらいの長さのサムネイルを取得したいですが、やりたかったことはできました。
解説でいくつかコードは載せましたが、今回は実質2~3行でできているのがRailsのすごいところですね。

https://gorails.com/episodes/how-to-create-an-active-storage-previewer

今回はあくまで簡易的な方法にこだわりましたが、Previewerを自分で定義してLibreOfficeのPowerPointのファイルから画像生成するという方法も紹介されていました。

他にもYouTubeのようにプレビューにGIF動画載せたりとかもしてみたいですが、長くなりそうなので今回はこれくらいで良しとしておこうかなと。

[shrine]:        https://shrinerb.com/
[carrierwave]:   https://github.com/carrierwaveuploader/carrierwave
[rails-guides]:  https://guides.rubyonrails.org/v6.1/active_storage_overview.html#analyzing-files
[alpine]:        https://pkgs.alpinelinux.org/package/v3.3/main/x86/ffmpeg
[sample-videos]: https://sample-videos.com/
[config]:        https://github.com/lkott/rubyonrails/blob/6-1-stable/guides/source/configuring.md#configuring-active-record
