# chrome-shanbay-v2

> shanbay chrome 网页查单词插件

是[jinntrance/shanbay-crx](https://github.com/jinntrance/shanbay-crx)的重构版

修改了：

- shanbay API。使用了新的API，使用的是OAuth2认证。之前的API已经被标记为废弃
- 之前的版本支持了Webster，现在没打算支持，等shanbay的完成之后再看吧
- 之前的版本是作者在学校写的，现在有了ES6，用ES6重写一下
- 所有用到的变量都会有注释，所有的常量也都标记出来
- 另外打算使用JSDoc

已知的问题

- 有些词语的释义渲染的很差。这个锅主要由扇贝的API来背……
- 开着chrome开发工具点击发音的时候，页面会崩溃。这个原因还待查。
- 网页中嵌套iframe的时候，不能正确触发事件。这个不打算处理。因为默认的获取选区方法是获取当前顶级文档下的选区。想要获取frame的选区必须得到frame的文档，但是页面不知道会嵌入多少个文档，所以这个很难处理。现在还在广泛使用嵌入frame的网页有网页播放器，网页邮箱，在一个网站获取一个社交的网站动态（比如微博）等。一个嵌套了frame的网页，对于用户来说，一眼是看不出来的。这个也不想弹出一个警告什么的，太丑了。所以，let it go吧。

todo：

- 精简css
-
