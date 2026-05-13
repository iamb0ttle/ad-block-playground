# Reversing: Before Making Ad-Block

In this document, I recognized the ads I found in the browser runtime and analyzed what type of ads they are and why.

The goal of this reversing step is not to inspect the original HTML as the main source of truth, but to observe how ads appear in the browser environment through DevTools, especially the Elements, Network, and runtime DOM changes.

---

### Ads 1: Top Banner Ad

- html tag:

    ```html
    <div class="ad-banner sponsor-post" id="top-ad-728x90" style="text-align: center; margin-bottom: 20px;">
        <a href="https://example.com/click" target="_blank">
            <img src="https://placehold.co/728x90/png?text=Top+Banner+Ad" alt="Advertisement" class="img-responsive">
        </a>
    </div>
    ```

- 주입방식 추측: 사이트 내부 직접 주입

- 근거:  
  DevTools Elements 탭에서 초기 렌더링 직후 해당 광고 영역이 이미 DOM에 존재하는 것을 확인했다.  
  런타임에서 별도의 JS 코드가 해당 class 또는 id를 가진 요소를 동적으로 생성하는 흐름은 관찰되지 않았다.  
  
  또한 해당 요소는 `ad-banner`, `sponsor-post`, `top-ad-728x90`처럼 광고로 추정할 수 있는 class/id 값을 가지고 있으며, 이미지의 `alt` 값도 `Advertisement`로 설정되어 있었다.  
  
  Source 탭에서 확인한 원본 HTML에서도 해당 요소가 `<script>` 내부가 아니라 `<body>` 하위에 직접 포함되어 있어, JS 기반 동적 주입보다는 사이트 내부에서 미리 배치한 정적 광고 슬롯으로 판단했다.

---

### Ads 2: In-Article Fallback Ad

- html tag:

    ```html
    <div id="article-middle-injector">
        <div data-ad-slot="in-article-fluid" style="margin: 20px 0px; text-align: center;">
            <img src="https://placehold.co/468x60/png?text=In-Article+Fallback+Ad" class="lazyload-ad ob-smart-feed">
        </div>
    </div>
    ```

- 주입방식 추측: JS 스크립트 기반 주입

- 근거:  
  DevTools Elements 탭에서 런타임 DOM을 확인했을 때, `article-middle-injector` 영역 내부에 광고성 콘텐츠가 삽입된 것을 확인했다.  
  
  Network 탭과 runtime 동작을 함께 확인한 결과, 광고 수집용 외부 스크립트인 `https://dummy-ad-server-999.com/serve.js`를 불러오려는 시도가 있었고, 해당 요청이 실패했을 때 fallback 광고가 삽입되는 흐름으로 보였다.  
  
  보조적으로 Source 탭에서 확인한 script 코드에서도 DOM selector를 이용해 `#article-middle-injector`를 선택한 뒤, fallback 광고 DOM을 삽입하는 로직을 확인했다.  
  
  따라서 이 광고는 처음부터 완성된 광고 DOM이 정적으로 존재한 것이 아니라, 페이지 런타임에서 JS가 특정 placeholder 영역을 선택해 광고 콘텐츠를 주입한 방식으로 판단했다.

---

### Ads 3: Sidebar Rectangle Ad

- html tag:

    ```html
    <div class="promo-content native-ad">
        <a href="http://track.ad-delivery.net/v1/click">
            <img src="https://placehold.co/300x250/png?text=Sidebar+Rectangle+Ad" width="300" height="250" data-tracker="doubleclick">
        </a>
    </div>
    ```

- 주입방식 추측: JS 스크립트 기반 주입

- 근거:  
  DevTools Elements 탭에서 sidebar 영역에 `promo-content native-ad` 클래스를 가진 광고 DOM이 삽입된 것을 확인했다.  
  
  해당 광고는 `300x250` 크기의 rectangle banner 형태이며, `native-ad`, `promo-content`, `track.ad-delivery.net`, `data-tracker="doubleclick"` 등 광고 또는 트래킹과 관련된 단서를 포함하고 있었다.  
  
  런타임 DOM을 확인했을 때, 이 광고는 `#sidebar-widget-area` 영역 내부에 삽입된 형태였다.  
  
  보조적으로 Source 탭에서 확인한 script 코드에서도 DOM selector를 기반으로 `#sidebar-widget-area`를 선택한 뒤 광고 DOM을 삽입하는 로직을 확인했다.  
  
  따라서 이 광고는 정적 HTML에 직접 배치된 광고라기보다는, JS가 sidebar placeholder를 선택해 광고 콘텐츠를 동적으로 주입하는 방식으로 판단했다.

---

### Ads 4: Floating Iframe Ad

- html tag:

    ```html
    <img src="https://placehold.co/250x250/png?text=Floating+Iframe+Ad" alt="promo" style="display:block; width:100%; height:auto;">
    ```

- 주입방식 추측: JS 스크립트 기반 지연 주입

- 근거:  
  DevTools Elements 탭에서 초기 페이지 로딩 직후에는 해당 광고가 바로 보이지 않았고, 일정 시간이 지난 뒤 floating 형태의 광고 영역이 DOM에 추가되는 것을 확인했다.  
  
  런타임 관찰 결과, 이 광고는 페이지 로드 직후 즉시 삽입되는 것이 아니라 약 2.5초 후 화면에 나타났다.  
  
  보조적으로 Source 탭에서 확인한 script 코드에서도 `setTimeout`을 이용해 일정 시간 이후 광고 DOM을 삽입하는 로직을 확인했다.  

  또한 Math.random() 기반 img wrapper div의 id를 변환하여 추적을 피하고 있고, iframe으로 한번더 감싸 영향범위를 독립시켰다.
  
  따라서 이 광고는 단순한 정적 광고나 즉시 실행되는 JS 주입 광고가 아니라, 시간 지연 후 DOM에 추가되는 delayed injection 방식의 광고로 판단했다.