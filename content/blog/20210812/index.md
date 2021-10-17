---
title: "URLSessionの最も単純な使い方"
date: "2021-08-12T08:42:53.793+09:00"
description: "iOSのアプリケーションがサーバーからJSONデータを取得するまで"
---

Swiftという言語に慣れていないのか、決して情報が少なくないわけでもないのですが、なかなかReactで書くようにすんなりできずにいました。
やはりサーバーサイドをずっとやってきた身としてはスタンドアロンよりはサーバーと通信させたいです。
JavaScriptではHTTP通信のクライアントにAxiosやFetchなどが使えますが、同じ感覚で使うには少々難しい。

Swiftにも[Alamofire][alamofire]というHTTP通信用のライブラリがありました。
このライブラリがデファクトなのかなと思いきや、いざ使ってみるとガイドで網羅されている情報だと足りなくてうまくいきませんでした。
また最近メジャーアップデートが行われたのか、情報も新旧混ざっていたためURLSessionを使う方がすんなり情報も見つかりました。

サーバー側は単純に`https://example.com/articles.json`で以下のJSONを返すと想定します:

```json
[
  {
    "id": 1,
    "title": "Quod recusandae sunt molestias.",
    "created_at": "2020-09-01T10:39:41+00:00",
    "updated_at": "2021-08-09T13:07:23+00:00"
  }
]
```

今回はモデル定義は割愛しますが、`Article.swift`に上記の定義を書きます。
ここでのポイントはJavaScriptと同様にサーバーは*snake_case*を返すがクライアントは*CamelCase*を用いています。
幸いSwiftではJSONのキーをあらかじめ変換してくれます。

```swift
let decoder = JSONDecoder()
decoder.keyDecodingStrategy = .convertFromSnakeCase
```

続いてSwiftUI側から先に見てみます:

```swift
import SwiftUI

struct ArticleList: View {
    @ObservedObject var modelData: ModelData

    var body: some View {
        List(modelData.articles) { article in
            Text(article.title)
        }
        .onAppear {
            modelData.fetch()
        }
    }
}
```

ここでのポイントは`@ObservedObject`を用いるということです。
`@ObservedObject`は内容に変更があると自動でViewに反映してくれるはず。
今回は`onAppear`を使ってみることにします。
他にも`ModelData`の`init()`に書く方法もありました。

```swift
class ModelData: ObservableObject {
    @Published var articles: [Article] = []

    func fetch() {
        let url = URL(string: "https://example.com/articles.json")!
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        let task = URLSession.shared.dataTask(with: url) { data, response, error in
            do {
                let json = try decoder.decode([Article].self, from: data!)
                self.articles = json
            } catch {
                fatalError("error")
            }
        }
        task.resume()
    }
}
```

本来であれば`error`や、`response`の処理も必要ですが、今回はわかりやすさ重視で省略しています。
`self.articles`の行で更新しているのですが、警告が出てしまうもののプレビュー画面では表示されるようになりました。
今回最もハマった箇所は`Article`を配列で受け取るのに`[Article].self`という記述ができることでした。

最初の一歩としてはまだまだ不十分かもしれませんが、これから徐々にPOSTやユーザーの認証、他にもiOSならではの制約等も含めて調べていくつもりです。

[alamofire]: https://github.com/Alamofire/Alamofire
