/* ========== SMARTSHOP ========== */

const $ = (id) => document.getElementById(id);

let cartItems = [];
let productData = [];
let couponOn = false;
let balance = Number(localStorage.getItem("balance")) || 500;

const OVER_LIMIT_MSG = "Warning: Total price exceeds your balance! Please add money.";


/* ---------- NAVBAR ---------- */

$("menu-btn").onclick = () => $("menu").classList.toggle("max-md:hidden");

const menuLinks = document.querySelectorAll("#menu a");
const pageSections = document.querySelectorAll("section");

window.addEventListener("scroll", () => {
  let active = "home";
  pageSections.forEach((sec) => {
    if (window.scrollY >= sec.offsetTop - 100) active = sec.id;
  });
  menuLinks.forEach((link) => {
    link.dataset.active = link.getAttribute("href") === "#" + active;
  });
  $("back-to-top").classList.toggle("hidden", window.scrollY <= 300);
});

$("back-to-top").onclick = () => window.scrollTo({ top: 0, behavior: "smooth" });

/* View Cart button: cart er kache scroll kore + ektu highlight kore */
$("view-cart").onclick = () => {
  $("cart").scrollIntoView({ behavior: "smooth", block: "start" });
  $("cart").classList.add("ring-4", "ring-orange-500");
  setTimeout(() => $("cart").classList.remove("ring-4", "ring-orange-500"), 1000);
};


/* ---------- CAROUSEL HELPER (banner + review duto ei ek function e) ---------- */

function makeCarousel(total, display, prevId, nextId, delay) {
  let pos = 0;
  const go = (step) => {
    pos = (pos + step + total) % total;
    display(pos);
  };
  $(prevId).onclick = () => go(-1);
  $(nextId).onclick = () => go(1);
  setInterval(() => go(1), delay);
  display(0);
}

const bannerImgs = document.querySelectorAll("#slider img");
makeCarousel(bannerImgs.length, (idx) => {
  bannerImgs.forEach((img, n) => img.classList.toggle("hidden", n !== idx));
}, "prev-slide", "next-slide", 3000);


/* ---------- BALANCE ---------- */

function updateBalance() {
  $("balance").textContent = balance;
  localStorage.setItem("balance", balance);
}

$("add-money").onclick = () => {
  balance += 200;
  updateBalance();
  $("warning").textContent = "";
};

updateBalance();


/* ---------- PRODUCTS ---------- */

fetch("https://dummyjson.com/products?limit=20")
  .then((res) => res.json())
  .then((data) => {
    productData = data.products;
    renderProducts(productData);
  })
  .catch(() => {
    $("product-list").innerHTML = "<p class='text-rose-600'>Failed to load products.</p>";
  });

function renderProducts(items) {
  $("product-list").innerHTML = items.length ? "" : "<p>No product found.</p>";

  items.forEach((prod) => {
    const box = document.createElement("div");
    box.className = "bg-white rounded-xl shadow-lg p-4 flex flex-col";
    box.innerHTML = `
      <img class="w-full h-40 object-contain" src="${prod.thumbnail}" alt="${prod.title}">
      <h3 class="text-sm font-bold flex-1 my-3">${prod.title}</h3>
      <p class="text-indigo-600 font-bold my-2">${prod.price} BDT</p>
      <p class="my-1">Rating: ${prod.rating} (${prod.stock} in stock)</p>
      <button class="bg-indigo-600 text-white px-3.5 py-2 rounded-lg hover:opacity-85">Add to Cart</button>
    `;
    box.querySelector("button").onclick = () => updateQty(prod, 1);
    $("product-list").appendChild(box);
  });
}

function applyFilters() {
  const keyword = $("search").value.toLowerCase();
  const order = $("sort").value;

  const found = productData.filter((p) => p.title.toLowerCase().includes(keyword));

  if (order === "low") found.sort((a, b) => a.price - b.price);
  if (order === "high") found.sort((a, b) => b.price - a.price);

  renderProducts(found);
}

$("search").oninput = applyFilters;
$("sort").onchange = applyFilters;


/* ---------- CART ---------- */

/* extra = notun je item add korte chai tar price (balance check er jonno) */
function calcTotals(extra = 0) {
  const subtotal = cartItems.reduce((sum, it) => sum + it.price * it.quantity, 0) + extra;
  const notEmpty = subtotal > 0;
  const delivery = notEmpty ? 50 : 0;
  const shipping = notEmpty ? 30 : 0;
  const discount = couponOn ? subtotal * 0.1 : 0;
  return { subtotal, delivery, shipping, discount, total: subtotal + delivery + shipping - discount };
}

/* change = +1 (add) ba -1 (kombe). Quantity 0 hole item remove hoye jay */
function updateQty(prod, change) {
  if (change > 0 && calcTotals(prod.price).total > balance) {
    $("warning").textContent = OVER_LIMIT_MSG;
    return;
  }
  $("warning").textContent = "";

  let entry = cartItems.find((it) => it.id === prod.id);
  if (!entry) {
    entry = { id: prod.id, title: prod.title, price: prod.price, image: prod.thumbnail, quantity: 0 };
    cartItems.push(entry);
  }
  entry.quantity += change;
  cartItems = cartItems.filter((it) => it.quantity > 0);
  renderCart();
}

function renderCart() {
  $("cart-items").innerHTML = cartItems.length
    ? cartItems.map((entry) => `
        <div class="cart-item border-b border-slate-300 py-2" data-id="${entry.id}">
          <div class="flex items-center gap-2">
            <img class="w-12 h-12 object-contain" src="${entry.image}" alt="${entry.title}">
            <h4 class="text-[13px] font-bold">${entry.title}</h4>
          </div>
          <div class="flex justify-between items-center mt-2">
            <div>
              <button class="bg-slate-200 text-black px-2 py-0.5 rounded-lg" data-action="minus">-</button>
              <span class="mx-1">${entry.quantity}</span>
              <button class="bg-slate-200 text-black px-2 py-0.5 rounded-lg" data-action="plus">+</button>
            </div>
            <p>${(entry.price * entry.quantity).toFixed(2)} BDT</p>
            <button class="text-rose-600" data-action="remove">Remove</button>
          </div>
        </div>`).join("")
    : "<p>Your cart is empty.</p>";

  const sum = calcTotals();
  $("subtotal").textContent = sum.subtotal.toFixed(2);
  $("delivery").textContent = sum.delivery;
  $("shipping").textContent = sum.shipping;
  $("discount").textContent = sum.discount.toFixed(2);
  $("total").textContent = sum.total.toFixed(2);
  $("cart-count").textContent = cartItems.reduce((sum, it) => sum + it.quantity, 0);
}

/* ekta listener diye cart er shob button handle kora hocche */
$("cart-items").onclick = (e) => {
  const act = e.target.dataset.action;
  if (!act) return;

  const found = cartItems.find((it) => it.id === Number(e.target.closest(".cart-item").dataset.id));
  const change = { plus: 1, minus: -1, remove: -found.quantity }[act];
  updateQty(found, change);
};

$("apply-coupon").onclick = () => {
  couponOn = $("coupon").value.trim().toUpperCase() === "SMART10";
  $("coupon-message").textContent = couponOn ? "Coupon applied! 10% discount." : "Invalid coupon code.";
  $("coupon-message").className = couponOn ? "text-emerald-600" : "text-rose-600";
  renderCart();
};

$("clear-cart").onclick = () => {
  cartItems = [];
  renderCart();
};

renderCart();


/* ---------- REVIEWS ---------- */

const reviewList = [
  { name: "Tanvir", comment: "Product quality ta onek bhalo, delivery o quick chilo.", rating: 5, date: "2026-09-10" },
  { name: "Mitu", comment: "Dam ta reasonable laglo. Abar kinbo.", rating: 4, date: "2026-09-18" },
  { name: "Arif", comment: "Website ta clean, use kora easy.", rating: 5, date: "2026-10-01" },
  { name: "Farhana", comment: "Product thik thak, tobe delivery ektu deri holo.", rating: 3, date: "2026-10-12" }
];

makeCarousel(reviewList.length, (idx) => {
  const rev = reviewList[idx];
  $("review-box").innerHTML = `
    <p>"${rev.comment}"</p>
    <h4>${rev.name}</h4>
    <p>Rating: ${rev.rating} / 5</p>
    <p>${rev.date}</p>
  `;
}, "prev-review", "next-review", 4000);


/* ---------- CONTACT FORM ---------- */

$("contact-form").onsubmit = (e) => {
  e.preventDefault();

  const userName = $("c-name").value.trim();
  const userEmail = $("c-email").value.trim();
  const userMsg = $("c-message").value.trim();

  let errMsg = "";
  if (!userName || !userEmail || !userMsg) errMsg = "Please fill in all fields.";
  else if (!userEmail.includes("@") || !userEmail.includes(".")) errMsg = "Please enter a valid email.";

  $("form-message").className = errMsg ? "text-rose-600" : "text-emerald-600";
  $("form-message").textContent = errMsg || `Thank you, ${userName}! We got your message.`;

  if (!errMsg) {
    e.target.reset();
    setTimeout(() => ($("form-message").textContent = ""), 3000);
  }
};
