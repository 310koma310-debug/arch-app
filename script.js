import {
  app,
  auth,
  db,
  storage
} from "./firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "firebase/auth";

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from "firebase/firestore";

console.log("Firebase接続成功:", app.name);

// ========================================
// 下部メニューの画面切り替え
// ========================================

const navigationItems = document.querySelectorAll(".navigation-item");
const pages = document.querySelectorAll(".page");

navigationItems.forEach((navigationItem) => {
  navigationItem.addEventListener("click", () => {
    const targetPageId = navigationItem.dataset.page;
    const targetPage = document.getElementById(targetPageId);

    if (!targetPage) {
      console.error(`画面が見つかりません: ${targetPageId}`);
      return;
    }

    pages.forEach((page) => {
      page.classList.remove("active-page");
    });

    navigationItems.forEach((item) => {
      item.classList.remove("active");
    });

    targetPage.classList.add("active-page");
    navigationItem.classList.add("active");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  });
});

// ========================================
// イベントの絞り込み
// ========================================

const filterButtons = document.querySelectorAll(".filter-button");
const eventCards = document.querySelectorAll(".event-list-card");

filterButtons.forEach((filterButton) => {
  filterButton.addEventListener("click", () => {
    const selectedFilter = filterButton.dataset.filter;

    filterButtons.forEach((button) => {
      button.classList.remove("active-filter");
    });

    filterButton.classList.add("active-filter");

    eventCards.forEach((eventCard) => {
      const eventStatus = eventCard.dataset.status;

      const shouldShow =
        selectedFilter === "all" ||
        selectedFilter === eventStatus;

      eventCard.hidden = !shouldShow;
    });
  });
});

// ========================================
// メンバー検索・絞り込み
// ========================================

const memberSearchInput = document.getElementById("member-search");
const memberFilterButtons = document.querySelectorAll(
  ".member-filter-button"
);
const memberCards = document.querySelectorAll(".member-card");
const memberCount = document.getElementById("member-count");
const memberEmpty = document.getElementById("member-empty");

let selectedMemberCategory = "all";

// メンバーの表示状態を更新する
function updateMemberList() {
  const searchWord =
    memberSearchInput?.value.trim().toLowerCase() ?? "";

  let visibleCount = 0;

  memberCards.forEach((memberCard) => {
    const memberCategory = memberCard.dataset.category ?? "";
    const memberSearchText = (
      memberCard.dataset.search ?? ""
    ).toLowerCase();

    const matchesCategory =
      selectedMemberCategory === "all" ||
      memberCategory === selectedMemberCategory;

    const matchesSearch =
      searchWord === "" ||
      memberSearchText.includes(searchWord);

    const shouldShow = matchesCategory && matchesSearch;

    memberCard.hidden = !shouldShow;

    if (shouldShow) {
      visibleCount += 1;
    }
  });

  if (memberCount) {
    memberCount.textContent = `${visibleCount}人`;
  }

  if (memberEmpty) {
    memberEmpty.hidden = visibleCount !== 0;
  }
}

// 検索欄に文字を入力したとき
memberSearchInput?.addEventListener("input", () => {
  updateMemberList();
});

// カテゴリーボタンを押したとき
memberFilterButtons.forEach((filterButton) => {
  filterButton.addEventListener("click", () => {
    selectedMemberCategory =
      filterButton.dataset.memberFilter ?? "all";

    memberFilterButtons.forEach((button) => {
      button.classList.remove("active-member-filter");
    });

    filterButton.classList.add("active-member-filter");

    updateMemberList();
  });
});

// 最初の表示を整える
updateMemberList();

// ========================================
// ホーム画面のボタンから別画面へ移動
// ========================================

const pageLinkButtons = document.querySelectorAll(".page-link");

pageLinkButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const targetPageId = button.dataset.targetPage;
    const targetPage = document.getElementById(targetPageId);

    if (!targetPage) {
      console.error(`移動先が見つかりません: ${targetPageId}`);
      return;
    }

    // すべての画面を非表示にする
    pages.forEach((page) => {
      page.classList.remove("active-page");
    });

    // 下部メニューの選択状態を変更する
    navigationItems.forEach((item) => {
      const isTargetButton =
        item.dataset.page === targetPageId;

      item.classList.toggle("active", isTargetButton);
    });

    // 移動先の画面を表示する
    targetPage.classList.add("active-page");

    // ページ上部へ戻る
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  });
});

// ========================================
// イベント詳細モーダル・参加機能
// ========================================

const eventDetailButtons = document.querySelectorAll(
  ".event-detail-button"
);

const eventModal = document.getElementById("event-modal");
const eventModalBackground = document.getElementById(
  "event-modal-background"
);
const eventModalClose = document.getElementById(
  "event-modal-close"
);

const eventModalTitle = document.getElementById(
  "event-modal-title"
);
const eventModalDescription = document.getElementById(
  "event-modal-description"
);
const eventModalTime = document.getElementById(
  "event-modal-time"
);
const eventModalLocation = document.getElementById(
  "event-modal-location"
);
const eventModalPeople = document.getElementById(
  "event-modal-people"
);

const eventJoinButton = document.getElementById(
  "event-join-button"
);

const JOINED_EVENTS_STORAGE_KEY = "arch-joined-events";

// 保存済みの参加イベントを読み込む
function loadJoinedEvents() {
  try {
    const savedEvents = localStorage.getItem(
      JOINED_EVENTS_STORAGE_KEY
    );

    if (!savedEvents) {
      return new Set();
    }

    const parsedEvents = JSON.parse(savedEvents);

    if (!Array.isArray(parsedEvents)) {
      return new Set();
    }

    return new Set(parsedEvents);
  } catch (error) {
    console.error(
      "参加イベントの読み込みに失敗しました。",
      error
    );

    return new Set();
  }
}

// 参加イベントを保存する
function saveJoinedEvents() {
  try {
    const joinedEventTitles = [...joinedEvents];

    localStorage.setItem(
      JOINED_EVENTS_STORAGE_KEY,
      JSON.stringify(joinedEventTitles)
    );
  } catch (error) {
    console.error(
      "参加イベントの保存に失敗しました。",
      error
    );
  }
}

const joinedEvents = loadJoinedEvents();

let currentEventTitle = "";

// イベント詳細を開く
function openEventModal(button) {
  if (!eventModal) {
    return;
  }

  currentEventTitle =
    button.dataset.eventTitle ?? "イベント";

  if (eventModalTitle) {
    eventModalTitle.textContent = currentEventTitle;
  }

  if (eventModalDescription) {
    eventModalDescription.textContent =
      button.dataset.eventDescription ?? "";
  }

  if (eventModalTime) {
    eventModalTime.textContent =
      button.dataset.eventTime ?? "";
  }

  if (eventModalLocation) {
    eventModalLocation.textContent =
      button.dataset.eventLocation ?? "";
  }

  if (eventModalPeople) {
    eventModalPeople.textContent =
      button.dataset.eventPeople ?? "";
  }

  if (eventJoinButton) {
    const isJoined = joinedEvents.has(currentEventTitle);

    eventJoinButton.textContent = isJoined
      ? "参加予定を取り消す"
      : "このイベントに参加する";
  }

  eventModal.removeAttribute("hidden");
  eventModal.style.display = "flex";
  document.body.classList.add("modal-open");
}

// イベント詳細を閉じる
function closeEventModal() {
  if (!eventModal) {
    return;
  }

  eventModal.setAttribute("hidden", "");
  eventModal.style.display = "none";
  document.body.classList.remove("modal-open");
}

// 「イベントを見る」を押したとき
eventDetailButtons.forEach((button) => {
  button.addEventListener("click", () => {
    openEventModal(button);
  });
});

// 参加・取り消し
eventJoinButton?.addEventListener("click", () => {
  if (!currentEventTitle) {
    return;
  }

  if (joinedEvents.has(currentEventTitle)) {
    joinedEvents.delete(currentEventTitle);
  } else {
    joinedEvents.add(currentEventTitle);
  }

  // 現在の参加状態をブラウザへ保存
  saveJoinedEvents();

  // ボタンの文字を更新
  const isJoined = joinedEvents.has(currentEventTitle);

  eventJoinButton.textContent = isJoined
    ? "参加予定を取り消す"
    : "このイベントに参加する";
});

// ×ボタン
eventModalClose?.addEventListener("click", () => {
  closeEventModal();
});

// 暗い背景
eventModalBackground?.addEventListener("click", () => {
  closeEventModal();
});

// Escキー
document.addEventListener("keydown", (event) => {
  if (
    event.key === "Escape" &&
    eventModal &&
    !eventModal.hidden
  ) {
    closeEventModal();
  }
});

// ========================================
// メンバー詳細モーダル
// ========================================

const memberDetailButtons = document.querySelectorAll(
  ".member-detail-button"
);

const memberModal = document.getElementById("member-modal");

const memberModalBackground = document.getElementById(
  "member-modal-background"
);

const memberModalClose = document.getElementById(
  "member-modal-close"
);

const memberModalAvatar = document.getElementById(
  "member-modal-avatar"
);

const memberModalRole = document.getElementById(
  "member-modal-role"
);

const memberModalName = document.getElementById(
  "member-modal-name"
);

const memberModalSchool = document.getElementById(
  "member-modal-school"
);

const memberModalBio = document.getElementById(
  "member-modal-bio"
);

const memberModalTags = document.getElementById(
  "member-modal-tags"
);

// メンバー詳細を開く
function openMemberModal(button) {
  if (!memberModal) {
    return;
  }

  if (memberModalAvatar) {
    memberModalAvatar.textContent =
      button.dataset.memberAvatar ?? "";
  }

  if (memberModalRole) {
    memberModalRole.textContent =
      button.dataset.memberRole ?? "メンバー";
  }

  if (memberModalName) {
    memberModalName.textContent =
      button.dataset.memberName ?? "メンバー";
  }

  if (memberModalSchool) {
    memberModalSchool.textContent =
      button.dataset.memberSchool ?? "";
  }

  if (memberModalBio) {
    memberModalBio.textContent =
      button.dataset.memberBio ?? "";
  }

  // 得意分野タグを作成する
  if (memberModalTags) {
    memberModalTags.innerHTML = "";

    const tags = (
      button.dataset.memberTags ?? ""
    )
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag !== "");

    tags.forEach((tag) => {
      const tagElement = document.createElement("span");
      tagElement.textContent = tag;
      memberModalTags.appendChild(tagElement);
    });
  }

  memberModal.removeAttribute("hidden");
  memberModal.style.display = "flex";
  document.body.classList.add("modal-open");
}

// メンバー詳細を閉じる
function closeMemberModal() {
  if (!memberModal) {
    return;
  }

  memberModal.setAttribute("hidden", "");
  memberModal.style.display = "none";
  document.body.classList.remove("modal-open");
}

// 「プロフィールを見る」を押したとき
memberDetailButtons.forEach((button) => {
  button.addEventListener("click", () => {
    openMemberModal(button);
  });
});

// ×ボタンを押したとき
memberModalClose?.addEventListener("click", () => {
  closeMemberModal();
});

// 暗い背景を押したとき
memberModalBackground?.addEventListener("click", () => {
  closeMemberModal();
});

// Escキーを押したとき
document.addEventListener("keydown", (event) => {
  if (
    event.key === "Escape" &&
    memberModal &&
    !memberModal.hidden
  ) {
    closeMemberModal();
  }
});

// ========================================
// メンバーとのつながり機能
// ========================================

const memberConnectButton = document.getElementById(
  "member-connect-button"
);

const CONNECTED_MEMBERS_STORAGE_KEY =
  "arch-connected-members";

let currentMemberName = "";

// 保存済みのメンバーを読み込む
function loadConnectedMembers() {
  try {
    const savedMembers = localStorage.getItem(
      CONNECTED_MEMBERS_STORAGE_KEY
    );

    if (!savedMembers) {
      return new Set();
    }

    const parsedMembers = JSON.parse(savedMembers);

    if (!Array.isArray(parsedMembers)) {
      return new Set();
    }

    return new Set(parsedMembers);
  } catch (error) {
    console.error(
      "つながり情報の読み込みに失敗しました。",
      error
    );

    return new Set();
  }
}

// つながり情報を保存する
function saveConnectedMembers() {
  try {
    localStorage.setItem(
      CONNECTED_MEMBERS_STORAGE_KEY,
      JSON.stringify([...connectedMembers])
    );
  } catch (error) {
    console.error(
      "つながり情報の保存に失敗しました。",
      error
    );
  }
}

const connectedMembers = loadConnectedMembers();

// ボタン表示を更新する
function updateConnectButton() {
  if (!memberConnectButton || !currentMemberName) {
    return;
  }

  const isConnected =
    connectedMembers.has(currentMemberName);

  memberConnectButton.textContent = isConnected
    ? "つながりを解除する"
    : "このメンバーとつながる";
}

// メンバー詳細を開いたとき
memberDetailButtons.forEach((button) => {
  button.addEventListener("click", () => {
    currentMemberName =
      button.dataset.memberName ?? "";

    updateConnectButton();
  });
});

// つながる・解除する
memberConnectButton?.addEventListener("click", () => {
  if (!currentMemberName) {
    return;
  }

  if (connectedMembers.has(currentMemberName)) {
    connectedMembers.delete(currentMemberName);
  } else {
    connectedMembers.add(currentMemberName);
  }

  saveConnectedMembers();
  updateConnectButton();
});

// ========================================
// お知らせ詳細モーダル
// ========================================

const noticeDetailButtons = document.querySelectorAll(
  ".notice-detail-button"
);

const noticeModal = document.getElementById(
  "notice-modal"
);

const noticeModalBackground = document.getElementById(
  "notice-modal-background"
);

const noticeModalClose = document.getElementById(
  "notice-modal-close"
);

const noticeModalCloseButton = document.getElementById(
  "notice-modal-close-button"
);

const noticeModalTitle = document.getElementById(
  "notice-modal-title"
);

const noticeModalDate = document.getElementById(
  "notice-modal-date"
);

const noticeModalCategory = document.getElementById(
  "notice-modal-category"
);

const noticeModalBody = document.getElementById(
  "notice-modal-body"
);

// お知らせ詳細を開く
function openNoticeModal(button) {
  if (!noticeModal) {
    return;
  }

  if (noticeModalTitle) {
    noticeModalTitle.textContent =
      button.dataset.noticeTitle ?? "お知らせ";
  }

  if (noticeModalDate) {
    noticeModalDate.textContent =
      button.dataset.noticeDate ?? "";
  }

  if (noticeModalCategory) {
    noticeModalCategory.textContent =
      button.dataset.noticeCategory ?? "お知らせ";
  }

  if (noticeModalBody) {
    noticeModalBody.innerHTML = "";

    const bodyParagraph = document.createElement("p");

    bodyParagraph.textContent =
      button.dataset.noticeBody ??
      "お知らせの本文がありません。";

    noticeModalBody.appendChild(bodyParagraph);
  }

  noticeModal.removeAttribute("hidden");
  noticeModal.style.display = "flex";

  document.body.classList.add("modal-open");
}

// お知らせ詳細を閉じる
function closeNoticeModal() {
  if (!noticeModal) {
    return;
  }

  noticeModal.setAttribute("hidden", "");
  noticeModal.style.display = "none";

  document.body.classList.remove("modal-open");
}

// お知らせを押したとき
noticeDetailButtons.forEach((button) => {
  button.addEventListener("click", () => {
    openNoticeModal(button);
  });
});

// ×ボタンを押したとき
noticeModalClose?.addEventListener("click", () => {
  closeNoticeModal();
});

// 下の「閉じる」ボタンを押したとき
noticeModalCloseButton?.addEventListener("click", () => {
  closeNoticeModal();
});

// 暗い背景を押したとき
noticeModalBackground?.addEventListener("click", () => {
  closeNoticeModal();
});

// Escキーを押したとき
document.addEventListener("keydown", (event) => {
  if (
    event.key === "Escape" &&
    noticeModal &&
    !noticeModal.hidden
  ) {
    closeNoticeModal();
  }
});
// ========================================
// Firebaseログイン・新規登録
// ========================================

const authScreen = document.getElementById(
  "auth-screen"
);

const archApp = document.getElementById(
  "app"
);

const authForm = document.getElementById(
  "auth-form"
);

const authEmailInput = document.getElementById(
  "auth-email"
);

const authPasswordInput = document.getElementById(
  "auth-password"
);

const authTitle = document.getElementById(
  "auth-title"
);

const authDescription = document.getElementById(
  "auth-description"
);

const authSubmitButton = document.getElementById(
  "auth-submit-button"
);

const authSwitchButton = document.getElementById(
  "auth-switch-button"
);

const authMessage = document.getElementById(
  "auth-message"
);
const signupProfileFields = document.getElementById(
  "signup-profile-fields"
);

const signupNameInput = document.getElementById(
  "signup-name"
);

const signupSchoolInput = document.getElementById(
  "signup-school"
);

const signupGradeSelect = document.getElementById(
  "signup-grade"
);

const profileAvatarInitial =
  document.getElementById(
    "profile-avatar-initial"
  );

const profileDisplayName =
  document.getElementById(
    "profile-display-name"
  );

const profileSchoolGrade =
  document.getElementById(
    "profile-school-grade"
  );

  const profileRole =
  document.getElementById(
    "profile-role"
  );

  const profileBio =
  document.getElementById(
    "profile-bio"
  );

  const profileEditButtons =
  document.querySelectorAll(
    ".profile-edit-button"
  );

const profileEditModal =
  document.getElementById(
    "profile-edit-modal"
  );

const profileEditBackground =
  document.getElementById(
    "profile-edit-background"
  );

const profileEditClose =
  document.getElementById(
    "profile-edit-close"
  );

const profileEditForm =
  document.getElementById(
    "profile-edit-form"
  );

const profileEditName =
  document.getElementById(
    "profile-edit-name"
  );

const profileEditSchool =
  document.getElementById(
    "profile-edit-school"
  );

const profileEditGrade =
  document.getElementById(
    "profile-edit-grade"
  );

const profileEditBio =
  document.getElementById(
    "profile-edit-bio"
  );

const profileEditMessage =
  document.getElementById(
    "profile-edit-message"
  );

let isSignUpMode = false;

// エラーメッセージを表示する
function showAuthMessage(message, isSuccess = false) {
  if (!authMessage) {
    return;
  }

  authMessage.textContent = message;

  authMessage.classList.toggle(
    "success-message",
    isSuccess
  );
}

// エラー内容を日本語へ変換する
function getAuthErrorMessage(errorCode) {
  switch (errorCode) {
    case "auth/invalid-email":
      return "メールアドレスの形式が正しくありません。";

    case "auth/weak-password":
      return "パスワードは6文字以上で入力してください。";

    case "auth/email-already-in-use":
      return "このメールアドレスはすでに登録されています。";

    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "メールアドレスまたはパスワードが違います。";

    case "auth/too-many-requests":
      return "試行回数が多すぎます。少し時間を空けてください。";

    case "auth/network-request-failed":
      return "通信に失敗しました。インターネット接続を確認してください。";

    default:
      return "処理に失敗しました。もう一度お試しください。";
  }
}

// ログイン画面を表示する
function showAuthScreen() {
  if (authScreen) {
    authScreen.hidden = false;
    authScreen.style.display = "flex";
  }

  if (archApp) {
    archApp.hidden = true;
    archApp.style.display = "none";
  }
}

// ARCH本体を表示する
function showArchApp() {
  if (authScreen) {
    authScreen.hidden = true;
    authScreen.style.display = "none";
  }

  if (archApp) {
    archApp.hidden = false;
    archApp.style.display = "";
  }
}

// ログインと新規登録を切り替える
function updateAuthMode() {
  if (isSignUpMode) {
    authTitle.textContent = "新規登録";

    authDescription.textContent =
      "プロフィール情報を入力して、ARCHアカウントを作成します。";

    authSubmitButton.textContent =
      "アカウントを作成する";

    authSwitchButton.textContent =
      "すでにアカウントをお持ちの方はこちら";

    authPasswordInput.autocomplete =
      "new-password";

    if (signupProfileFields) {
      signupProfileFields.hidden = false;
      signupProfileFields.style.display = "flex";
    }

    if (signupNameInput) {
      signupNameInput.required = true;
    }

    if (signupSchoolInput) {
      signupSchoolInput.required = true;
    }

    if (signupGradeSelect) {
      signupGradeSelect.required = true;
    }
  } else {
    authTitle.textContent = "ログイン";

    authDescription.textContent =
      "ARCHアカウントへログインしてください。";

    authSubmitButton.textContent =
      "ログイン";

    authSwitchButton.textContent =
      "アカウントをお持ちでない方はこちら";

    authPasswordInput.autocomplete =
      "current-password";

    if (signupProfileFields) {
      signupProfileFields.hidden = true;
      signupProfileFields.style.display = "none";
    }

    if (signupNameInput) {
      signupNameInput.required = false;
    }

    if (signupSchoolInput) {
      signupSchoolInput.required = false;
    }

    if (signupGradeSelect) {
      signupGradeSelect.required = false;
    }
  }

  showAuthMessage("");
}

authSwitchButton?.addEventListener("click", () => {
  isSignUpMode = !isSignUpMode;
  updateAuthMode();
});

// ログイン・新規登録フォーム
authForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email =
    authEmailInput?.value.trim() ?? "";

  const password =
    authPasswordInput?.value ?? "";
    const name =
  signupNameInput?.value.trim() ?? "";

const school =
  signupSchoolInput?.value.trim() ?? "";

const grade =
  signupGradeSelect?.value ?? "";

  if (!email || !password) {
    showAuthMessage(
      "メールアドレスとパスワードを入力してください。"
    );
    return;
  }

  if (password.length < 6) {
    showAuthMessage(
      "パスワードは6文字以上で入力してください。"
    );
    return;
  }
if (
  isSignUpMode &&
  (!name || !school || !grade)
) {
  showAuthMessage(
    "名前・学校名・学年をすべて入力してください。"
  );

  return;
}
  if (authSubmitButton) {
    authSubmitButton.disabled = true;
    authSubmitButton.textContent = "処理中...";
  }

  showAuthMessage("");

  try {
    if (isSignUpMode) {
  // Firebase Authenticationにアカウントを作成
  const userCredential =
    await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

  const user = userCredential.user;

  // Firestoreにプロフィールを保存
  await setDoc(
    doc(db, "users", user.uid),
    {
      uid: user.uid,
      email: user.email,
      name: name,
      school: school,
      grade: grade,
      bio: "",
      tags: [],
      role: "member",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }
  );

  console.log(
    "プロフィールを保存しました:",
    user.uid
  );
} else {
  await signInWithEmailAndPassword(
    auth,
    email,
    password
  );
}

    authForm.reset();
  } catch (error) {
    console.error(
      "認証処理に失敗しました。",
      error
    );

    showAuthMessage(
      getAuthErrorMessage(error.code)
    );
  } finally {
    if (authSubmitButton) {
      authSubmitButton.disabled = false;
    }

    updateAuthMode();
  }
});

// ログイン状態を監視する
function openProfileEditModal() {
  if (!profileEditModal) {
    return;
  }

  profileEditModal.hidden = false;
  document.body.classList.add("modal-open");
}

function closeProfileEditModal() {
  if (!profileEditModal) {
    return;
  }

  profileEditModal.hidden = true;
  document.body.classList.remove("modal-open");

  if (profileEditMessage) {
    profileEditMessage.textContent = "";
  }
}

profileEditButtons.forEach((button) => {
  button.addEventListener(
    "click",
    openProfileEditModal
  );
});

profileEditClose?.addEventListener(
  "click",
  closeProfileEditModal
);

profileEditBackground?.addEventListener(
  "click",
  closeProfileEditModal
);
profileEditForm?.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    const user = auth.currentUser;

    if (!user) {
      if (profileEditMessage) {
        profileEditMessage.textContent =
          "ログイン情報が確認できません。";
      }

      return;
    }

    const name =
      profileEditName?.value.trim() ?? "";

    const school =
      profileEditSchool?.value.trim() ?? "";

    const grade =
      profileEditGrade?.value ?? "";

    const bio =
      profileEditBio?.value.trim() ?? "";

    if (!name || !school || !grade) {
      if (profileEditMessage) {
        profileEditMessage.textContent =
          "名前・学校名・学年を入力してください。";
      }

      return;
    }

    try {
     await setDoc(
  doc(db, "users", user.uid),
  {
    uid: user.uid,
    email: user.email,
    name: name,
    school: school,
    grade: grade,
    bio: bio,
    role: "member",
    updatedAt: serverTimestamp()
  },
  {
    merge: true
  }
);

      await loadUserProfile(user);

      closeProfileEditModal();
    } catch (error) {
      console.error(
        "プロフィール更新エラー:",
        error
      );

      if (profileEditMessage) {
        profileEditMessage.textContent =
          "プロフィールを保存できませんでした。";
      }
    }
  }
);
async function loadUserProfile(user) {
  if (!user) {
    return;
  }

  const userDocRef = doc(
    db,
    "users",
    user.uid
  );

  const userSnapshot =
    await getDoc(userDocRef);

  if (!userSnapshot.exists()) {
    console.warn(
      "プロフィールデータが見つかりません"
    );

    return;
  }

  const profile = userSnapshot.data();

  if (profileDisplayName) {
    profileDisplayName.textContent =
      profile.name || "名前未設定";
  }

  if (profileSchoolGrade) {
    const school =
      profile.school || "学校未設定";

    const grade =
      profile.grade || "学年未設定";

    profileSchoolGrade.textContent =
      `${school}・${grade}`;
  }

  if (profileAvatarInitial) {
    const name = profile.name || "";

    profileAvatarInitial.textContent =
      name.slice(-1) || "?";
  }

  if (profileRole) {
  profileRole.textContent =
    profile.role === "member"
      ? "メンバー"
      : "運営メンバー";
}

if (profileBio) {
  profileBio.textContent =
    profile.bio?.trim() ||
    "自己紹介文はまだ設定されていません。";
}
}
onAuthStateChanged(auth, async (user) => {
  if (user) {
    showArchApp();

    try {
      await loadUserProfile(user);
    } catch (error) {
      console.error(
        "プロフィールの読み込みに失敗しました:",
        error
      );
    }
  } else {
    showAuthScreen();
  }
});