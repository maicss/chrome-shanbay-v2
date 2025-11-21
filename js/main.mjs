(async () => {
  const src = chrome.runtime.getURL("js/const.mjs");
  const { debugLogger, storageSettingMap, defaultIgnoreSites } = await import(
    src
  );
  // import {debugLogger, storageSettingMap, defaultIgnoreSites} from './const.mjs'

  const storage = {};
  /** 当前选区的父级body
   * @type {DOM(body) | null}
   * */
  let selectionParentBody = null;

  // @param {DOM(range) | null}
  let selectionRange = null;

  const popoverWidth = 280;

  /**
   * 从chrome的storage里获取存储的插件的设置，如果有值，就给storage赋值，否者就使用默认的storageSettingMap
   * */
  chrome.storage.sync.get("__shanbayExtensionSettings", (settings) => {
    debugLogger("info", "chrome storage loaded");
    if (Object.keys(settings).length) {
      settings.__shanbayExtensionSettings.forEach((item) => {
        Object.assign(storage, item);
      });
    } else {
      Object.assign(storage, storageSettingMap);
    }
  });

  /**
   * 监听设置变化的事件，如果修改了设置，就更新全局的storage的值
   * */
  chrome.storage.onChanged.addListener(function (changes) {
    debugLogger("info", "chrome storage changed");
    changes.__shanbayExtensionSettings.newValue.forEach((item) => {
      Object.assign(storage, item);
    });
  });
  /**
   * 双击事件和右键选中后的事件处理器。
   * @function pendingSearchSelection
   * @param {object}[event] - 双击事件的对象
   * 兼容性: node.getRootNode: chrome 54+
   * */
  const pendingSearchSelection = (event) => {
    if (defaultIgnoreSites.some((site) => location.hostname.includes(site)))
      return;
    if (
      storage.ignoreSites &&
      storage.ignoreSites.some((site) => location.hostname.includes(site))
    )
      return;

    const _popover = document.querySelector("#__shanbay-popover");
    if (_popover) return;
    let _selection = getSelection();
    if (!_selection.rangeCount) return;
    let _range = getSelection().getRangeAt(0);
    selectionRange = _range;
    if (event && storage.clickLookup) {
      selectionParentBody = event.target.getRootNode().body;
      let matchResult = getSelection()
        .toString()
        .trim()
        .match(/^[a-zA-Z\s']+$/);
      if (matchResult) {
        popover({ loading: true, msg: "查询中...." });
        debugLogger("info", "get word: ", matchResult[0]);
        chrome.runtime.sendMessage({
          action: "lookup",
          word: matchResult[0],
        });
      }
    } else {
      selectionParentBody = _range.startContainer.ownerDocument.body;
    }
  };

  /**
   * 获取输入框中选中文本的坐标
   */
  const getSelectionRect = (range) => {
    const rect = range.getBoundingClientRect();
    if (rect.width > 0 || rect.height > 0) {
      return rect;
    }

    const activeEl = document.activeElement;
    if (
      activeEl &&
      (activeEl.tagName === "TEXTAREA" || activeEl.tagName === "INPUT")
    ) {
      try {
        const mirrorDiv = document.createElement("div");
        const style = window.getComputedStyle(activeEl);

        // 复制样式
        Array.from(style).forEach((key) => {
          mirrorDiv.style.setProperty(key, style.getPropertyValue(key));
        });

        mirrorDiv.style.position = "absolute";
        mirrorDiv.style.visibility = "hidden";
        mirrorDiv.style.top = "-9999px";
        mirrorDiv.style.left = "-9999px";
        mirrorDiv.style.whiteSpace = "pre-wrap";

        // 对于 input，需要特殊处理 white-space
        if (activeEl.tagName === "INPUT") {
          mirrorDiv.style.whiteSpace = "pre";
        }

        const text = activeEl.value;
        const start = activeEl.selectionStart;
        const end = activeEl.selectionEnd;

        const beforeText = text.substring(0, start);
        const selectedText = text.substring(start, end);
        const afterText = text.substring(end);

        const span = document.createElement("span");
        span.textContent = selectedText;

        mirrorDiv.textContent = beforeText;
        mirrorDiv.appendChild(span);
        mirrorDiv.appendChild(document.createTextNode(afterText));

        document.body.appendChild(mirrorDiv);

        const spanRect = span.getBoundingClientRect();
        const inputRect = activeEl.getBoundingClientRect();

        // 计算相对位置
        // 注意：这里只是简化的计算，可能需要考虑 scroll 等因素
        // 实际上 mirrorDiv 应该完全重叠在 activeEl 上才能最准确，但那样会遮挡
        // 所以我们计算 span 在 mirrorDiv 中的 offset，然后应用到 activeEl 上

        // 更准确的做法：
        // 将 mirrorDiv 放置在 body 中，但是位置和 activeEl 一致（或者不一致，只算相对位移）
        // 这里我们采用计算 span 相对于 mirrorDiv 的偏移量，加上 activeEl 的位置

        // 由于 mirrorDiv 的样式复制了 padding border 等，内容区域应该是一致的
        // 但是 scrollLeft / scrollTop 需要处理

        const mirrorRect = mirrorDiv.getBoundingClientRect();
        const spanRelativeTop = spanRect.top - mirrorRect.top;
        const spanRelativeLeft = spanRect.left - mirrorRect.left;

        const top = inputRect.top + spanRelativeTop - activeEl.scrollTop;
        const left = inputRect.left + spanRelativeLeft - activeEl.scrollLeft;

        document.body.removeChild(mirrorDiv);

        return {
          top: top,
          left: left,
          width: spanRect.width,
          height: spanRect.height,
          bottom: top + spanRect.height,
          right: left + spanRect.width,
          x: left,
          y: top
        };

      } catch (e) {
        console.error("Error calculating textarea rect", e);
        return rect;
      }
    }
    return rect;
  };

  /**
   * @desc 根据弹窗高度动态计算弹出框位置。
   * @desc 1，页面居中位置，空间足够时，弹窗在单词的正下方
   * @desc 2，单词靠近左边区域，左边区域不支持弹窗居中显示，则弹窗位置以选中区域的左边缘为起点
   * @desc 3，单词靠近右边区域，右边区域不支持弹窗居中显示，则弹窗位置以选中区域的右边缘为终点
   * @desc 5，单词靠近屏幕底部区域，底部区域空间不够窗向下显示，则弹窗位置以选中区域的上部开始向上渲染
   * @desc 6，如果选中区域上方下方的高度都不能放下弹窗内容，则使用较高的空间展示弹窗，且使弹窗滚动
   * @desc 也即是每次 __shanbay-popover 内容有更新或者显示后，根据选中文本计算当前弹窗的位置，以保证不滚动可视区域的时候，可以完整看到弹窗。
   * 不return了，直接修改dom样式
   * returns {{popper: {top: number, left: number}, arrow: {top: string, left: number, bottom: string}} - 计算后的位置和最大高度
   */
  function calculatePopoverPosition() {
    const arrwoWidth = 11
    // 默认的垂直和水平间距
    const SPACING = 4;


    // 1. 获取选中区域的边界矩形 (相对于视口)
    const rect = getSelectionRect(selectionRange);
    debugLogger("rect", rect);

    // 2. 获取视口的尺寸
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const popper = { top: 0, left: 0 };
    const arrow = {
      top: "-11px",
      left: "50%",
      bottom: "unset",
      rotate: "0deg",
    };

    // --- 垂直定位 (Y 轴) ---

    // 选中区域下方空间
    const spaceBelow = viewportHeight - rect.bottom - SPACING;
    // 选中区域上方空间
    const spaceAbove = rect.top - SPACING;
    let maxHeight = Math.max(spaceBelow, spaceAbove); // 初始最大高度为理想高度
    const mainContainer = document.querySelector("#__shanbay-popover");
    const popoverHeight = mainContainer.offsetHeight;
    mainContainer.style.maxHeight = maxHeight + "px";

    // 优先尝试向下渲染
    if (spaceBelow >= popoverHeight) {
      // ✅ 空间足够，向下显示
      popper.top = rect.bottom + arrwoWidth;
      maxHeight = popoverHeight;
    } else if (spaceAbove >= popoverHeight) {
      // ✅ 下方不足，但上方足够，向上显示
      popper.top = rect.top - popoverHeight - arrwoWidth;
      maxHeight = popoverHeight;
      arrow.top = "unset";
      arrow.left = `calc(50% - ${arrwoWidth}px)`;
      arrow.rotate = "180deg";
      arrow.bottom = `-${arrwoWidth}px`;
    } else {
      // ⚠️ 上下空间都不足，选择空间较大的一侧并设置 maxHeight 启用滚动

      if (spaceBelow >= spaceAbove && spaceBelow > 0) {
        // ⬇️ 下方空间较大 (或相等)，向下显示，并限制高度
        popper.top = rect.bottom - arrwoWidth;
        maxHeight = spaceBelow;
        arrow.left = `calc(50% - ${arrwoWidth}px)`;
      } else if (spaceAbove > 0) {
        // ⬆️ 上方空间较大，向上显示，并限制高度
        maxHeight = spaceAbove;
        popper.top = rect.top - maxHeight;
        arrow.top = "unset";
        arrow.left = `calc(50% - ${arrwoWidth}px)`;
        arrow.bottom = `-${arrwoWidth}px`;
      } else {
        // ❌ 极小概率事件：上方和下方空间都为 0 (或负数)，通常发生在屏幕极小或元素贴边时。
        // 默认放在下方，并限制高度为 0 (实际上不会发生，只是为了逻辑完整)
        popper.top = rect.bottom;
        maxHeight = 0;
      }

      // 如果计算出的 maxHeight 小于一个合理的最小高度，可能需要强制设置一个值或给用户提示
      maxHeight = Math.max(0, maxHeight);
    }

    // --- 水平定位 (X 轴) ---

    // 1. 尝试水平居中
    let potentialLeft = rect.left + rect.width / 2 - popoverWidth / 2;

    // 2. 检查是否超出左边缘 (规则 2)
    if (potentialLeft < SPACING) {
      // 靠近左边区域，左边空间不支持居中，左边缘对齐选中区域的左边缘
      popper.left = rect.left;
      // 确保不会超出左侧视口边界（例如，选中区域本身就在屏幕外）
      popper.left = Math.max(SPACING, popper.left);
      arrow.left = Math.min(rect.width / 2, 8) + "px";
    }
    // 3. 检查是否超出右边缘 (规则 3)
    else if (potentialLeft + popoverWidth > viewportWidth) {
      // 靠近右边区域，右边空间不支持居中，右边缘对齐选中区域的右边缘
      popper.left = rect.right - popoverWidth;
      // 确保不会超出右侧视口边界
      popper.left = Math.min(viewportWidth - popoverWidth, popper.left);

      // 计算箭头位置：让箭头指向选中区域的中心
      const selectionCenter = rect.left + rect.width / 2;
      let arrowLeft = selectionCenter - popper.left - arrwoWidth;

      // 限制箭头在 popover 内部，保留 6px 的圆角安全距离
      arrowLeft = Math.max(6, Math.min(arrowLeft, popoverWidth - arrwoWidth * 2 - 6));
      arrow.left = arrowLeft + "px";
    } else {
      // ✅ 居中安全，采用居中位置 (规则 1)
      popper.left = potentialLeft;
    }
    popper.top = popper.top + window.scrollY;
    popper.left = popper.left + window.scrollX;
    // return { popper, arrow };

    mainContainer.style.top = popper.top + "px";
    mainContainer.style.left = popper.left + "px";
    mainContainer.classList.remove("invisible");
    const arrowElement = mainContainer.querySelector("#shanbay-arrow");
    arrowElement.style.left = arrow.left;
    arrowElement.style.top = arrow.top;
    arrowElement.style.bottom = arrow.bottom;
    arrowElement.style.rotate = arrow.rotate;
  }

  /**
   * 根据参数和设置渲染弹出框，并处理弹出框上的各种事件
   * @function popover
   * @param {object} res
   * @param {boolean} [res.loading] - 查询前的准备状态和未登录的提示
   * @param {object} [res.data] - 查询结果
   * */
  const popover = (res) => {
    /** 如果全局的父级body不存在，使用pendingSearchSelection查找父级body，是右键查询，非事件触发使用的*/
    if (!selectionParentBody) {
      pendingSearchSelection();
    }

    /** 先根据选区确定弹出框的位置，生成弹出框，然后根据参数和设置，往里面插入内容*/
    let html = `<div id="__shanbay-popover" class="invisible">
      <div id="shanbay-arrow"></div>
      <div id="shanbay-inner">
        <div id="shanbay-title" style="border: none;"></div>
      </div>
    </div>`;

    /** 这里是为了防止多次调用popover产生多个弹出框的。因为一次查询最起码会调用两次popover*/
    if (!document.querySelector("#__shanbay-popover")) {
      selectionParentBody.insertAdjacentHTML("beforeEnd", html);
    }

    const mainContainer = document.querySelector("#__shanbay-popover");

    if (res.loading) {
      /** 查询之前和未登录的提示信息*/
      mainContainer.querySelector("#shanbay-title").innerHTML = res.msg;
    } else if (res.data.msg) {
      mainContainer.querySelector("#shanbay-inner").innerHTML = `
    <div id="shanbay-title" class="has-error">
      <div class="error-message">${res.data.msg}</div>
      ${[400, 401, 403].includes(res.data.status) ? '<div class="login"><a href="https://web.shanbay.com/web/account/login/" target="_blank" class="shanbay-btn">去登录</a></div>' : ""}
    </div>`;
    } else {
      /** 查询单词或者单词其他操作成功*/
      let data = res.data;
      const assemblyPronunciationStr = () => {
        if (!data.audios.length) return "";
        let str = "";
        if (data.audios[0].uk) {
          str += "<div>";
          str += `<span>uk: </span><small>/${data.audios[0].uk.ipa}/</small> `;
          if (data.audios[0].uk.urls.length)
            str += `<span class="speaker uk" data-target="${data.audios[0].uk.urls[0]}"></span> `;
          str += "</div>";
        }
        if (data.audios[0].us) {
          str += "<div>";
          str += `<span>us: </span><small>/${data.audios[0].us.ipa}/</small> `;
          if (data.audios[0].us.urls.length)
            str += `<span class="speaker us" data-target="${data.audios[0].us.urls[0]}"></span> `;
          str += "</div>";
        }
        return str;
      };
      let contentHtml = `
      <div id="shanbay-title">
          <span class="word">${data.content}</span>
          <a class="check-detail" href="https://web.shanbay.com/wordsweb/#/detail/${data.id}" target="_blank"> 查看详情 </a>
          <div class="phonetic-symbols">${assemblyPronunciationStr()}</div>
      </div>
      <div id="shanbay-content">
          <div class="simple-definition">
              ${storage.paraphrase !== "English" ? (data.definitions.cn.length ? `<div><b>中文：</b> ${data.definitions.cn.map((p) => `<div><span style="color: #333">${p.pos} </span><span>${p.def}</span></div>`).join("")}</div>` : "") : ""}
              ${storage.paraphrase !== "Chinese" ? (data.definitions.en.length ? `<div><b>英文：</b>${data.definitions.en.map((p) => `<div><span style="color: #333">${p.pos} </span><span>${p.def}</span></div>`).join("")}</div>` : "") : ""}
          </div>
          <div id="shanbay-example-sentence-div" class="hide"></div>
          <div id="shanbay-footer">
            <span id="shanbay-example-sentence-span" class="hide"><button id="shanbay-example-sentence-btn" class="shanbay-btn">查看例句</button></span>
            ${data.exists === "error" ? "" : `<span id="shanbay-add-word-span"><button id="shanbay-add-word-btn" class="shanbay-btn ${data.exists ? "forget" : ""}">${data.exists ? "我忘了" : "添加"}</button></span>`}
          </div>
      </div>
    `;

      mainContainer.querySelector("#shanbay-inner").innerHTML = contentHtml;

      calculatePopoverPosition();

      /** 各种事件的处理*/
      /** 发音事件的处理 */
      Array.from(mainContainer.querySelectorAll(".speaker")).forEach(
        (speaker) => {
          if (
            speaker.classList.contains(data.__shanbayExtensionSettings.autoRead)
          ) {
            chrome.runtime.sendMessage({
              action: "playSound",
              url: speaker.dataset.target,
            });
          }
          speaker.addEventListener("click", function () {
            chrome.runtime.sendMessage({
              action: "playSound",
              url: this.dataset.target,
            });
          });
        },
      );

      const exampleSentenceBtn = mainContainer.querySelector(
        "#shanbay-example-sentence-btn",
      );
      const exampleSentenceSpan = mainContainer.querySelector(
        "#shanbay-example-sentence-span",
      );

      /** 添加单词和忘记单词的事件处理*/
      const addWordBtn = mainContainer.querySelector("#shanbay-add-word-btn");
      if (data.exists === true) {
        addWordBtn.addEventListener("click", function () {
          chrome.runtime.sendMessage({
            action: "addOrForget",
            word: data.content,
            wordID: data.id,
          });
        });
      } else if (data.exists === false) {
        if (storage.addBook) {
          addWordBtn.className = "hide";
          chrome.runtime.sendMessage({
            action: "addOrForget",
            word: data.content,
            wordID: data.id,
          });
        } else {
          addWordBtn.addEventListener("click", function () {
            chrome.runtime.sendMessage({
              action: "addOrForget",
              word: data.content,
              wordID: data.id,
            });
          });
        }
      }

      if (storage.exampleSentence) {
        exampleSentenceSpan.classList.remove("hide");
        exampleSentenceBtn.addEventListener("click", () => {
          chrome.runtime.sendMessage({ action: "getWordExample", id: data.id });
        });
      }
    }
  };

  /** 与 background 交互，返回信息的处理 */
  chrome.runtime.onMessage.addListener(function (res) {
    const addWordSpan = document.querySelector("#shanbay-add-word-span");
    const exampleSentenceDiv = document.querySelector(
      "#shanbay-example-sentence-div",
    );
    const exampleSentenceSpan = document.querySelector(
      "#shanbay-example-sentence-span",
    );
    switch (res.action) {
      case "lookup":
        popover({ loading: false, data: res.data });
        break;
      case "addOrForget":
        if (res.data.errors === "SUCCESS") {
          addWordSpan.innerHTML = "添加失败";
        } else {
          addWordSpan.innerHTML = "添加成功";
        }
        break;
      case "getWordExample":
        exampleSentenceDiv.innerHTML = res.data
          .map(
            (item, index) =>
              `<p>${index + 1}, ${item.content_en.replaceAll("vocab", "b")} <span class="speaker" data-target="${item.audio.us.urls[0]}"></span></p><p>  ${item.content_cn}</p>`,
          )
          .join("");
        exampleSentenceDiv.className = "simple-definition";
        exampleSentenceSpan.innerHTML = "";
        Array.from(exampleSentenceDiv.querySelectorAll(".speaker")).forEach(
          (dom) => {
            dom.addEventListener("click", function () {
              chrome.runtime.sendMessage({
                action: "playSound",
                url: this.dataset.target,
              });
            });
          },
        );
        calculatePopoverPosition();
        break;
    }
  });
  /**
   * 隐藏弹出框
   * @function hidePopover
   * @param {number} delay, ms 隐藏弹出框的延迟
   * */
  const hidePopover = (delay) => {
    setTimeout(function () {
      selectionParentBody.removeChild(
        document.querySelector("#__shanbay-popover"),
      );
      selectionParentBody = null;
    }, delay || 0);
  };

  if (
    document.addEventListener ||
    event.type === "load" ||
    document.readyState === "complete"
  ) {
    // document.addEventListener('DOMContentLoaded', function () {
    // console.log('Shanbay Extension DOMContentLoaded......')
    // if (chrome.tab)
    document.addEventListener("dblclick", pendingSearchSelection);
    document.addEventListener("click", function (e) {
      /** 屏蔽弹出框的双击事件*/
      const _popover = document.querySelector("#__shanbay-popover");
      if (_popover && selectionParentBody) {
        if (!e.composedPath().some((ele) => ele === _popover)) {
          hidePopover();
        }
      }
    });
    // })
  }
})();
