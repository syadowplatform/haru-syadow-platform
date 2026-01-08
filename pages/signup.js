import { auth, db } from "./firebase.js";

import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  fetchSignInMethodsForEmail,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

import {
  doc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

/* ----------------------------
  DOM
---------------------------- */
const form = document.getElementById("signupForm");

const roleEl = document.getElementById("role");
const emailEl = document.getElementById("email");
const checkEmailBtn = document.getElementById("checkEmailBtn");

const pwEl = document.getElementById("password");
const pw2El = document.getElementById("passwordConfirm");

const fullNameEl = document.getElementById("fullName");
const playingNameEl = document.getElementById("playingName"); // optional
const birthEl = document.getElementById("birth");

const countryEl = document.getElementById("country");
const genderEl = document.getElementById("gender");

const signupBtn = document.getElementById("signupBtn");

const emailStatusEl = document.getElementById("emailStatus");
const pwHintEl = document.getElementById("pwHint");
const pwStatusEl = document.getElementById("pwStatus");
const countryHintEl = document.getElementById("countryHint");
const msgEl = document.getElementById("msg");

/* ----------------------------
  Helpers
---------------------------- */
function setHint(el, text = "", type = "info") {
  if (!el) return;
  el.textContent = text;
  el.dataset.type = type; // 원하면 CSS에서 [data-type="ok"] 이런식으로 색 바꾸기 가능
}

function isPasswordStrong(pw) {
  // ✅ 6개 이상 + 대문자 + 소문자 + 기호
  const len = pw.length >= 6;
  const upper = /[A-Z]/.test(pw);
  const lower = /[a-z]/.test(pw);
  const symbol = /[^A-Za-z0-9]/.test(pw);
  return len && upper && lower && symbol;
}

function validatePasswordUI() {
  const pw = (pwEl.value || "").trim();

  if (!pw) {
    setHint(pwHintEl, "");
    return false;
  }

  if (!isPasswordStrong(pw)) {
    setHint(pwHintEl, "Password must be 6+ chars with upper/lower/symbol.", "warn");
    return false;
  }

  setHint(pwHintEl, "Good password ✅", "ok");
  return true;
}

function validatePwMatchUI() {
  const pw = pwEl.value || "";
  const pw2 = pw2El.value || "";

  if (!pw2) {
    setHint(pwStatusEl, "");
    return false;
  }

  const ok = pw === pw2;
  setHint(pwStatusEl, ok ? "Match ✅" : "Not match ❌", ok ? "ok" : "warn");
  return ok;
}

/**
 * ✅ 국적은 "없어도 입력 저장 가능"을 원했지?
 * 그래서:
 * - 비어있으면 X (required니까)
 * - 리스트에 없더라도 저장은 가능 O
 * - 다만 힌트로만 "Not in list" 알려줌
 */
function validateCountryUI() {
  const v = (countryEl.value || "").trim();
  if (!v) {
    setHint(countryHintEl, "");
    return false;
  }

  // datalist 안에 존재하는지 "힌트"만 주기 (통과는 시킴)
  const list = document.getElementById("countryList");
  if (!list) {
    setHint(countryHintEl, "");
    return true;
  }

  const options = Array.from(list.options || []);
  const exists = options.some(opt => (opt.value || "").toLowerCase() === v.toLowerCase());

  if (!exists) {
    setHint(countryHintEl, "Not in suggestions, but it will still be saved.", "info");
  } else {
    setHint(countryHintEl, "", "ok");
  }
  return true;
}

/* ----------------------------
  Enable / Disable signup button
---------------------------- */
let emailCheckedOK = false;

function updateSignupButtonState() {
  const requiredFilled =
    roleEl.value &&
    (emailEl.value || "").trim() &&
    (pwEl.value || "").trim() &&
    (pw2El.value || "").trim() &&
    (fullNameEl.value || "").trim() &&
    birthEl.value &&
    (countryEl.value || "").trim() &&
    genderEl.value;

  const pwOk = validatePasswordUI();
  const pwMatchOk = validatePwMatchUI();
  const countryOk = validateCountryUI();

  signupBtn.disabled = !(requiredFilled && pwOk && pwMatchOk && countryOk && emailCheckedOK);
}

/* ----------------------------
  Email Duplicate Check
---------------------------- */
async function handleCheckEmail() {
  const email = (emailEl.value || "").trim();

  if (!email) {
    setHint(emailStatusEl, "Enter email first.", "warn");
    emailCheckedOK = false;
    updateSignupButtonState();
    return;
  }

  setHint(emailStatusEl, "Checking...", "info");

  try {
    const methods = await fetchSignInMethodsForEmail(auth, email);
    if (methods && methods.length > 0) {
      setHint(emailStatusEl, "This email is already in use.", "warn");
      emailCheckedOK = false;
    } else {
      setHint(emailStatusEl, "Email available ✅", "ok");
      emailCheckedOK = true;
    }
  } catch (err) {
    setHint(emailStatusEl, `Check failed: ${err.message}`, "warn");
    emailCheckedOK = false;
  }

  updateSignupButtonState();
}

/* ----------------------------
  Sign Up Submit
---------------------------- */
async function handleSignup(e) {
  e.preventDefault();

  updateSignupButtonState();
  if (signupBtn.disabled) return;

  const role = roleEl.value;
  const email = (emailEl.value || "").trim();
  const password = pwEl.value;

  const fullName = (fullNameEl.value || "").trim();
  const playingName = (playingNameEl.value || "").trim(); // optional
  const birth = birthEl.value; // YYYY-MM-DD
  const country = (countryEl.value || "").trim();
  const gender = genderEl.value;

  signupBtn.disabled = true;
  setHint(msgEl, "Creating account...", "info");

  try {
    // 1) Create Auth user
    const cred = await createUserWithEmailAndPassword(auth, email, password);

    // 2) Send verification email
    await sendEmailVerification(cred.user);

    // 3) Save profile to Firestore
    await setDoc(doc(db, "users", cred.user.uid), {
      role,
      email,
      fullName,
      playingName: playingName || "", // optional
      birth,
      country,
      gender,
      emailVerified: false, // 로그인 시 cred.user.emailVerified로 갱신 가능
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    setHint(
      msgEl,
      "✅ Sign up success! Verification email sent. Please verify, then log in.",
      "ok"
    );

    // 원하면 자동으로 로그인페이지로 보내기
    // window.location.href = "login.html";
  } catch (err) {
    setHint(msgEl, `❌ Sign up failed: ${err.message}`, "warn");
    signupBtn.disabled = false;
  }
}

/* ----------------------------
  Events
---------------------------- */
checkEmailBtn.addEventListener("click", handleCheckEmail);

// 이메일 바꾸면 중복확인 다시 하게 만들기
emailEl.addEventListener("input", () => {
  emailCheckedOK = false;
  setHint(emailStatusEl, "Please click Check.", "info");
  updateSignupButtonState();
});

// 입력 변화 감지
[
  roleEl, emailEl, pwEl, pw2El, fullNameEl, playingNameEl, birthEl, countryEl, genderEl
].forEach(el => el.addEventListener("input", updateSignupButtonState));

[
  roleEl, genderEl
].forEach(el => el.addEventListener("change", updateSignupButtonState));

form.addEventListener("submit", handleSignup);

// 초기 상태
setHint(emailStatusEl, "Please click Check.", "info");
updateSignupButtonState();
