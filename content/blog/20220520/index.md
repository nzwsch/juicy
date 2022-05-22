---
title: "RailsのInsertを高速化する"
date: "2022-05-20T22:06:45.731+09:00"
description: "transactionを使うと高速化できるという謎にせまる"
---

趣味プログラミングの題材としてごみの収集日を調べるアプリケーションを作りたいと思っています。

今回使用するデータは**収集日の日付**、**曜日**、**収集区域の名称**と**収集品目のID**です。
以下のschemeのテーブルとモデルがあると想定してください。

```ruby
create_table "collection_dates", force: :cascade do |t|
  t.date "date", null: false
  t.string "weekday", null: false
  t.bigint "collection_area_id", null: false
  t.datetime "created_at", precision: 6, null: false
  t.datetime "updated_at", precision: 6, null: false
  t.index ["collection_area_id"], name: "index_collection_dates_on_collection_area_id"
end
```

**NOTE:** 書いていて気づいたのですが今回の投稿では*収集品目のID*が出てきません。単純に実装漏れです。

```
日付,曜日,中央区1,中央区2,中央区3,中央区4,中央区5,中央区6,豊平区1,豊平区2,豊平区3,豊平区4,清田区1,清田区2,北区1,北区2,北区3,北区4,北区5,北区6,東区1,東区2,東区3,東区4,東区5,東区6,白石区1,白石区2,白石区3,白石区4,厚別区1,厚別区2,厚別区3,厚別区4,南区1,南区2,南区3,南区4,南区5,南区6,南区7,西区1,西区2,西区3,西区4,手稲区1,手稲区2,手稲区3
2017-10-02,月,1,1,1,10,9,8,10,8,9,1,1,1,1,1,1,10,8,9,1,1,1,10,8,9,9,2,8,1,1,1,1,1,1,1,1,11,9,9,8,1,1,1,9,8,11,8
2017-10-03,火,8,10,9,1,1,1,1,1,1,10,9,8,9,10,8,1,1,1,10,8,9,1,1,1,1,1,1,8,9,9,8,2,9,11,8,1,1,1,1,9,11,8,1,1,1,1
2017-10-04,水,10,9,8,9,8,10,9,10,8,8,10,9,10,8,9,9,10,8,9,10,8,9,10,8,2,8,9,2,8,2,2,9,8,9,11,8,8,11,9,8,9,11,11,9,8,11
2017-10-05,木,1,1,1,8,10,9,8,9,10,1,1,1,1,1,1,8,9,10,1,1,1,8,9,10,8,9,2,1,1,1,1,1,1,1,1,9,11,8,11,1,1,1,8,11,9,9
2017-10-06,金,9,8,10,1,1,1,1,1,1,9,8,10,8,9,10,1,1,1,8,9,10,1,1,1,1,1,1,9,2,8,9,8,11,8,9,1,1,1,1,11,8,9,1,1,1,1
```

CSVファイルの中身を拝借しているのですが、こんな具合で日付がずらっと並んでいて*収集区域の名称*はDBに入っている値を`select`しようと思っています。
一番最初は*収集区域*毎に`for`文で回した場合の実装方法です。

```ruby
garvage_collection_csv.each do |row|
  date    = row[0]
  weekday = row[1]

  row.headers[2..].each do |name|
    collection_area = CollectionArea.find_by_name(name)
    CollectionDate.create(
      date: date,
      weekday: weekday,
      collection_area: collection_area,
    )
  end
end
```

実行してみると計測不能なくらい遅かったです。

日付の行は全部で738行に対して、*収集区域*は46箇所あるので33,948回`select`文と`insert`文が実行されているわけです。
というわけでRubyの`group_by`を使って*収集区域*別に日付をグループ化して一気に`insert`する方法へ書き換えてみます。

```ruby
collection_dates = []

garvage_collection_csv.each do |row|
  date    = row[0]
  weekday = row[1]

  row.headers[2..].each do |name|
    collection_dates.push({ date: date, weekday: weekday, name: name })
  end
end

grouped_dates = collection_dates.group_by { |item| item[:name] }

grouped_dates.each do |name, collection_dates|
  collection_area = CollectionArea.find_by_name(name)

  ActiveRecord::Base.transaction do
    collection_dates.each do |item|
      CollectionDate.create(
        date: item[:date],
        weekday: item[:weekday],
        collection_area: collection_area,
      )
    end
  end
end
```

以前Railsで複数行を`create`(`insert`)するときに[トランザクション][rails-transaction]を使うと処理が早くなるということを教えてもらったことがありました。

上記コードを実行した結果がこちら:
```
real    0m52.246s
user    0m39.794s
sys     0m1.269s
```

実際にはDBの初期化から`db:seed`までを行っているので純粋な`insert`の時間ではないのですが、およそ1分かからないくらいでした。

ログの一部を抜粋してみると:
```
  CollectionDate Create (0.3ms)  INSERT INTO "collection_dates" ("date", "weekday", "collection_area_id", "created_at", "updated_at") VALUES ($1, $2, $3, $4, $5) RETURNING "id"  [["date", "2018-01-05"], ["weekday", "金"], ["collection_area_id", 25], ["created_at", "2022-05-20 12:24:29.341672"], ["updated_at", "2022-05-20 12:24:29.341672"]]
  CollectionDate Create (0.3ms)  INSERT INTO "collection_dates" ("date", "weekday", "collection_area_id", "created_at", "updated_at") VALUES ($1, $2, $3, $4, $5) RETURNING "id"  [["date", "2018-01-06"], ["weekday", "土"], ["collection_area_id", 25], ["created_at", "2022-05-20 12:24:29.342861"], ["updated_at", "2022-05-20 12:24:29.342861"]]
  CollectionDate Create (0.3ms)  INSERT INTO "collection_dates" ("date", "weekday", "collection_area_id", "created_at", "updated_at") VALUES ($1, $2, $3, $4, $5) RETURNING "id"  [["date", "2018-01-07"], ["weekday", "日"], ["collection_area_id", 25], ["created_at", "2022-05-20 12:24:29.344034"], ["updated_at", "2022-05-20 12:24:29.344034"]]
```

こんな感じのログになっていました。
`transaction`のブロックの位置はあまり関係ないようで、ループ全体を囲っても実行結果に大きな差は出ませんでした。

```ruby
grouped_dates.each do |name, collection_dates|
  collection_area = CollectionArea.find_by_name(name)

  collection_dates.each do |item|
    CollectionDate.create(
      date: item[:date],
      weekday: item[:weekday],
      collection_area: collection_area,
    )
  end
end
```

それでは`transaction`を使わない場合はどうなるか試してみたところ、およそ倍以上遅くなってしまいました:
```
real    2m27.348s
user    1m35.721s
sys     0m3.686s
```

これは大量のSQLの実行はトランザクションで高速化されるのかという仮説を立ててみたのですが、ログを見直してみて気づきました:
```
  TRANSACTION (0.2ms)  BEGIN
  CollectionDate Create (0.4ms)  INSERT INTO "collection_dates" ("date", "weekday", "collection_area_id", "created_at", "updated_at") VALUES ($1, $2, $3, $4, $5) RETURNING "id"  [["date", "2017-10-02"], ["weekday", "月"], ["collection_area_id", 1], ["created_at", "2022-05-20 12:28:15.006910"], ["updated_at", "2022-05-20 12:28:15.006910"]]
  TRANSACTION (1.0ms)  COMMIT
  TRANSACTION (0.2ms)  BEGIN
  CollectionDate Create (0.4ms)  INSERT INTO "collection_dates" ("date", "weekday", "collection_area_id", "created_at", "updated_at") VALUES ($1, $2, $3, $4, $5) RETURNING "id"  [["date", "2017-10-03"], ["weekday", "火"], ["collection_area_id", 1], ["created_at", "2022-05-20 12:28:15.011202"], ["updated_at", "2022-05-20 12:28:15.011202"]]
  TRANSACTION (1.0ms)  COMMIT
```

`insert`とは別に`transaction`の開始とコミットでおよそ1.2msかかっているようでした。
つまりRailsで複数の`insert`を行うときは`ActiveRecord::Base.transaction`のブロックを囲うことで内部の`transaction`の生成を抑えることができて高速化されたように見えたわけ。

ところでRails 6には[`insert_all`][rails-6-insert-all]というメソッドが追加されたらしいです。
もともとリンクの記事にも言及がある[activerecord-import][activerecord-import]というgemを使うと配列をいい感じにひとつの`insert`文に書き換えてくれるようなのですが、gemを使わなくてもよくなったので早速書き換えてみました。

```ruby
grouped_dates.each do |name, collection_dates|
  collection_area_id = CollectionArea.find_by_name(name).id
  collection_dates   = collection_dates.map do |item|
    {
      date: item[:date],
      weekday: item[:weekday],
      collection_area_id: collection_area_id,
      created_at: Time.current,
      updated_at: Time.current,
    }
  end

  CollectionDate.insert_all(collection_dates)
end
```

注意点としては`create`とは異なり、純粋なSQLに近いのでリレーションのIDやタイムスタンプは明示的に指定しなければならないようです。
Rails 7の[`insert_all`][rails-7-insert-all]であればタイムスタンプは自動的に`insert`してくれるようです。

上記の実行結果です:
```
real    0m7.766s
user    0m5.406s
sys     0m0.209s
```

1分近くかかっていた操作がわずか10秒近くまで早くなればこれ以上言うことはありませんよね。
このコードに対して`transaction`の有無は実行結果に影響はありませんでした。

今回はRailsでまとまったレコードの挿入にはぜひ使いたい`insert_all`でしたが、配列に変換しないといけないので若干使い勝手がよくありません。
しかし、実行結果は劇的に改善するので特に大量のデータは威力を発揮するのでぜひ忘れたくないものです。

[rails-transaction]: https://api.rubyonrails.org/classes/ActiveRecord/Transactions/ClassMethods.html
[rails-6-insert-all]: https://blog.saeloun.com/2019/11/26/rails-6-insert-all.html
[activerecord-import]: https://github.com/zdennis/activerecord-import
[rails-7-insert-all]: https://blog.saeloun.com/2022/01/18/rails-7-updates-timestamp-for-insert-and-upsert-all-queries.html
