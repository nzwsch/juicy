---
title: "Swift UIの理解を深めよう"
date: "2021-07-24T23:25:34.880+09:00"
description: "Demistify SwiftUIのビデオの要点をまとめてみました"
---

SwiftUIの書籍を読破したのでなにか作りたい気持ちなのですが、たまたま見つけた[Demystify SwiftUI][video]というビデオの内容が興味深かったのでブログに残してみようと思いました。
動画やプログラムは再頒布禁止なので、もしかするとこの投稿は公開を取り消される可能性があります。
また動画の内容をすべて理解して聴き取れているわけではないので、誤訳等あるかもしれませんのであしからず。

---

まずは**Explicit identity**と**Structural identity**があります。
SwiftUIを理解するにはこの2つの概念を理解する必要があります。

```swift
ScrollViewReader { proxy in
  ScrollView {
    HeaderView(article)
      .id(articleId)

    Spacer()

    Button("トップへ") {
      withAnimation {
        proxy.scrollTo(articleId)
      }
    }
  }
}
```

この例では`articleId`という明確な識別子を与えることで`HeaderView`にジャンプすることが可能ですが、ここにある`ScrollViewReader`を始めとするビューには明示的な識別子が存在していないように見えます。
しかし、識別子がないように見えるだけでそれぞれのビューには暗黙的な識別子が存在しています。

次のような`if`文による条件式のコードがあるとします:

```swift
var body: some View {
  if articles.isEmpty {
    NewArticleForm()
  } else {
    ArticleList()
  }
}
```

この`if`文の条件式は`_ConditionalContext`に展開され、真の場合は常に`NewArticleForm`を、偽の場合は常に`ArticleList`を返すことでそれぞれのビューに暗黙的な識別子を割り当てています。

```
some View =
  _ConditionalContext<
    NewArticleForm,
    ArticleList
  >
```

そのため以下のコードはどちらも動作するのですが、SwiftUIでは同一のビューに同じ識別子を用いるために以下のように書くのが好ましいようです。

```swift
// Bad
VStack {
  if article.isPublished {
    ArticleDetail()
      .foregroundColor(Color.blue)
      .background(Color.red)
  } else {
    ArticleDetail()
      .foregroundColor(Color.red)
      .background(Color.blue)
  }
}

// Good
VStack {
  ArticleDetail()
    .foregroundColor(article.isPublished ? Color.blue : Color.red)
    .background(article.isPublished ? Color.red : Color.blue)
}
```

内部的なヘルパー関数で`article`のタイプによって表示したいビューが分岐する場合はどうでしょうか。
Swiftでは単一の型を返り値として指定する必要があるので`AnyView`を指定する必要があるのですが、Swiftは条件式を最適化することができません。
見た目にもかなりごちゃごちゃしているので次のステップで書き換えます。

```swift
func view(for article: Article) -> some View {
  var articleView
  if article.category == .photo {
    articleView = AnyView(PhotoArticleView())
  } else if article.category == .music {
    articleView = AnyView(MusicArticleView())
  } else if article.category == .video {
    articleView = AnyView(VideoArticleView())
    if article.hasThumbnail {
      articleView = AnyView(HStack {
        VideoThumbnail()
        articleView
      })
    }
  } else {
    articleView = AnyView(ArticleView())
  }
  return articleView
}
```

1. まずは条件式のうちのビューを単純化します

```swift
func view(for article: Article) -> some View {
  var articleView
  if article.category == .photo {
    articleView = AnyView(PhotoArticleView())
  } else if article.category == .music {
    articleView = AnyView(MusicArticleView())
  } else if article.category == .video {
    articleView = AnyView(HStack {
      if article.hasThumbnail {
        VideoThumbnail()
      }
      VideoArticleView()
    })
  } else {
    articleView = AnyView(ArticleView())
  }
  return articleView
}
```

2. 返り値が単純になったため、`return`構文とローカル変数を取り除きます

```swift
func view(for article: Article) -> some View {
  if article.category == .photo {
    AnyView(PhotoArticleView())
  } else if article.category == .music {
    AnyView(MusicArticleView())
  } else if article.category == .video {
    AnyView(HStack {
      if article.hasThumbnail {
        VideoThumbnail()
      }
      VideoArticleView()
    })
  } else {
    AnyView(ArticleView())
  }
}
```

3. `return`を消すと構文エラーになってしまうので、暗黙的に省略されていた`@ViewBuilder`修飾子を手動で追加し、`AnyView`も削除します

```swift
@ViewBuilder
func view(for article: Article) -> some View {
  if article.category == .photo {
    PhotoArticleView()
  } else if article.category == .music {
    MusicArticleView()
  } else if article.category == .video {
    HStack {
      if article.hasThumbnail {
        VideoThumbnail()
      }
      VideoArticleView()
    }
  } else {
    ArticleView()
  }
}
```

上記のコードの型は次のように展開されます:

```
some View =
  _ConditionalContent<
    _ConditionalContent<
      PhotoArticleView,
      MusicArticleView
    >,
    _ConditionalContent<
      HStack<
        TupleView<(
          VideoThumbnail?,
          VideoArticleView
        )>
      >
      ArticleView
    >
  >
```

また、上記のコードはさらに`switch`文で書き換えることもできます:

```swift
@ViewBuilder
func view(for article: Article) -> some View {
  switch article.category {
  case .photo:
    PhotoArticleView()
  case .music:
    MusicArticleView()
  case .video:
    HStack {
      if article.hasThumbnail {
        VideoThumbnail()
      }
      VideoArticleView()
    }
  default:
    ArticleView()
  }
}
```

続いてビューに使われる値についてです。
この例では同じビューが使われています。

```swift
var body: some View {
  if article.isPublished {
    ArticleEdit()
  } else {
    ArticleEdit()
      .contentEditableStyle()
  }
}
```

上記のビューで条件式が切り替わるたびに同じ初期値(`""`)がメモリ上で確保されます。

```swift
struct Article: Identifiable {
  var id: UUID
}

ForEach(articles) { article in
  DetailArticle(article)
}
```

ビューの値は短命なので、それぞれのビューに任意の識別子を与えることが重要です。
この例では`Identifiable`を指定することで、`UUID`を識別子として明示しています。

```swift
enum Category { case photo, music }

struct Article: Identifiable {
  var id: UUID { UUID() }
  var category: Category
}

struct ArticleList: View {
  var articles: [Article]
  var body: some View {
    List {
      ForEach(articles) {
        ArticleDetail($0)
      }
    }
  }
}
```

ただし上記のコードにはバグがあります。
記事(*Article*)の`id`に`UUID`を指定していますが、記事が更新されるたびに画面上すべての記事が更新されてしまいます。
識別子には静的な値を指定する必要があります。

```swift
struct ArticleList: View {
  var articles: [Article]
  var body: some View {
    List {
      ForEach(articles.indices, id: \.self) {
        ArticleDetail(articles[$0])
      }
    }
  }
}
```

このコードはまだ十分ではなく、このままだとインデックスによって内容が変わってしまいます。
例えば先頭に新しい記事が加わり末尾に追加される場合、更新される記事は1つなのに2つの記事が変更されます。

```swift
struct ArticleList: View {
  var articles: [Article]
  var body: some View {
    List {
      ForEach(articles.indices, id: \.databaseID) {
        ArticleDetail(articles[$0])
      }
    }
  }
}
```

この場合の解決策はデータベースに登録されているIDやシリアルナンバーなどの値を識別子として指定することです。
SwiftUIの識別子は開発者が適切な値を指定して管理する必要があります。
上記のことから識別子がユニークであることは非情に重要です。

```swift
ForEach(articles, id: \.serialNumber) { article in
  ArticleDetail(article)
    .modifier(ReservedArticleModifier(date: article.publishedAt))
}

struct ReservedArticleModifier: ViewModifier {
  var date: Date
  func body(content: Content) -> some View {
    if date > .now {
      content.opacity(0)
    } else {
      content
    }
  }
}
```

例えば予約された投稿は透過処理を行うモディファイアがあるとします。
この場合も`date`が変わるたびに内容が更新されてしまうようなので、次のように書くとよいみたいです:

```swift
struct ReservedArticleModifier: ViewModifier {
  var date: Date
  func body(content: Content) -> some View {
    content.opacity(date > .now ? 0 : 1)
  }
}
```

この例ではわかりやすい分岐でしたが、ファイル間をまたぐときに思わぬ分岐を生み出す可能性があります。
それを防ぐには不活性モディファイア(*Inert Modifier*)と呼ばれるパターンを使います:

```swift
struct ReservedArticleModifier: ViewModifier {
  func body(content: Content) -> some View {
    content.opacity(1.0)
  }
}
```

モディファイアの値を変えること自体はさほどコストがかからないため、透過したい箇所に`opacity(0)`を直接指定できるようにします。
不活性モディファイアは他にも`padding(0)`や`transformEnvironment {}`などがあります。

---

書籍のコードは途中で動かなくなったのともともとの変更が多いのでいきなり最適化に取り組むのは少々大変ですが、まずは単純な条件式でコードを書いたり`Identifiable`を利用することを意識するようにしていきたいと思っています。

[video]: https://developer.apple.com/videos/play/wwdc2021/10022/
