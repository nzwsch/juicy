---
title: "ActiveStorageでMinIOにアップロードする方法"
date: "2021-10-02T17:42:51.531+09:00"
description: "タイトルの通りActiveStorageの小ネタです"
---

**TL;DR** `force_path_style: true`を指定してください

Amazon S3互換の[MinIO](https://min.io/)はセルフホスティングできるS3として、開発用としても自宅の運用にも便利です。
これまで何回かActiveStorageのネタで投稿していますが、今まで手っ取り早くストレージの保存先はRailsの`storage`ディレクトリでした。
Dockerでコンテナイメージを作成するので特に自分で運用する場合はRailsでも良い気がしますが、前回のNginxと組み合わせるのにActiveStorageだけだと少々取り回しにくいなと思いました。

新しいRailsの作成は[rails-prompt](https://github.com/nzwsch/rails-prompt)などを使ってもらうとして、`storage.yml`の記述は以下のようにしました。

```yaml
amazon:
  service: S3
  access_key_id: <%= Rails.application.credentials.dig(:aws, :access_key_id) %>
  secret_access_key: <%= Rails.application.credentials.dig(:aws, :secret_access_key) %>
  region: us-east-1
  bucket: myapp
  endpoint: http://localhost:9000
  force_path_style: true
```

ここでのポイントは正しく`region`を指定すること、`bucket`を指定すること、`endpoint`を指定することです。
[MinIO Docker Quickstart Guide][guide]をもとにDocker経由で作成したので`endpoint`は`http://localhost:9000`です。
WebのUIは`http://localhost:9001`でしたので注意。

続いてWebに`MINIO_ROOT_USER`と`MINIO_ROOT_PASSWORD`を入力してログインしたら`http://localhost:9001/buckets`で上で指定した`bucket`を作成しておきます。
DockerのVolumeを初期化したりするとログインして作成しないといけないのでややこしいですが、今回は割愛します。
続いて`http://localhost:9001/settings`の`Edit Region Configuration`で`us-east-1`などに指定しておきました。

さて実際にRails側でこの設定でファイルをアップロードしてみると以下のエラーが表示されました。

    Aws::S3::Errors::MalformedXML (The XML you provided was not well-formed or did not validate against our published schema.):

これはどうして起こるのかというと、エンドポイントのURLが`http://myapp.localhost:9000`を指定しているみたいでした。
そこで冒頭の`force_path_style: true`を加えてあげることで`http://localhost:9000/myapp`の形式に戻るというわけ。
相変わらずRails Guidesの方には記載がありませんが、今回は[Rails ActiveStorage Configuration for Minio][resource]というページを参考に解決しました。

またつい最近[Cloudflare R2][r2]というサービスが追加されたので試してみたいところですね。

[guide]: https://docs.min.io/docs/minio-docker-quickstart-guide.html
[resource]: https://kevinjalbert.com/rails-activestorage-configuration-for-minio/
[r2]: https://www.cloudflare.com/press-releases/2021/cloudflare-announces-r2-storage/
