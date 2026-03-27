import Float "mo:core/Float";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Order "mo:core/Order";

import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  // ── V1 types (must match the original schema exactly so Motoko can load
  //          the old stable data into `userExpenses` on upgrade) ──────────
  type OldCategory = {
    #food; #transport; #housing; #entertainment;
    #health; #shopping; #other;
  };

  type OldExpense = {
    id    : Nat;
    title : Text;
    amount: Float;
    category : OldCategory;
    date  : Text;
    notes : ?Text;
  };

  // Same name as the original stable variable → Motoko loads old data here.
  let userExpenses : Map.Map<Principal, Map.Map<Nat, OldExpense>> = Map.empty();

  // ── V2 types ───────────────────────────────────────────────────────────
  type Category = {
    #food; #transport; #housing; #entertainment;
    #health; #shopping; #other;
    #apnaMart; #jioMart; #flipkartMinutes; #amazon;
  };

  module Category {
    public func compare(a : Category, b : Category) : Order.Order {
      switch (a, b) {
        case (#food,            #food)            #equal;
        case (#food,            _)                #less;
        case (_,                #food)            #greater;
        case (#transport,       #transport)       #equal;
        case (#transport,       _)                #less;
        case (_,                #transport)       #greater;
        case (#housing,         #housing)         #equal;
        case (#housing,         _)                #less;
        case (_,                #housing)         #greater;
        case (#entertainment,   #entertainment)   #equal;
        case (#entertainment,   _)                #less;
        case (_,                #entertainment)   #greater;
        case (#health,          #health)          #equal;
        case (#health,          _)                #less;
        case (_,                #health)          #greater;
        case (#shopping,        #shopping)        #equal;
        case (#shopping,        _)                #less;
        case (_,                #shopping)        #greater;
        case (#apnaMart,        #apnaMart)        #equal;
        case (#apnaMart,        _)                #less;
        case (_,                #apnaMart)        #greater;
        case (#jioMart,         #jioMart)         #equal;
        case (#jioMart,         _)                #less;
        case (_,                #jioMart)         #greater;
        case (#flipkartMinutes, #flipkartMinutes) #equal;
        case (#flipkartMinutes, _)                #less;
        case (_,                #flipkartMinutes) #greater;
        case (#amazon,          #amazon)          #equal;
        case (#amazon,          _)                #less;
        case (_,                #amazon)          #greater;
        case (#other,           #other)           #equal;
      };
    };
  };

  type Expense = {
    id    : Nat;
    title : Text;
    amount: Float;
    category : Category;
    date  : Text;
    notes : ?Text;
  };

  module Expense {
    public func compare(a : Expense, b : Expense) : Order.Order {
      Nat.compare(a.id, b.id);
    };
    public func compareByAmount(a : Expense, b : Expense) : Order.Order {
      Float.compare(a.amount, b.amount);
    };
    public func compareByCategory(a : Expense, b : Expense) : Order.Order {
      Category.compare(a.category, b.category);
    };
  };

  public type UserProfile = { name : Text };

  // ── V2 storage (new variable name → starts empty, populated by migration) ──
  let userExpenses_v2 : Map.Map<Principal, Map.Map<Nat, Expense>> = Map.empty();
  let userProfiles    : Map.Map<Principal, UserProfile>           = Map.empty();
  var nextExpenseId   = 0;
  var _migrated       = false;

  // ── One-time migration after upgrade ────────────────────────────────────
  system func postupgrade() {
    if (not _migrated) {
      userExpenses.entries().forEach(func((principal, oldMap)) {
        let newMap = Map.empty<Nat, Expense>();
        oldMap.entries().forEach(func((id, old)) {
          let cat : Category = switch (old.category) {
            case (#food)          #food;
            case (#transport)     #transport;
            case (#housing)       #housing;
            case (#entertainment) #entertainment;
            case (#health)        #health;
            case (#shopping)      #shopping;
            case (#other)         #other;
          };
          newMap.add(id, {
            id       = old.id;
            title    = old.title;
            amount   = old.amount;
            category = cat;
            date     = old.date;
            notes    = old.notes;
          });
        });
        userExpenses_v2.add(principal, newMap);
      });
      _migrated := true;
    };
  };

  // ── Authorization ─────────────────────────────────────────────────────────
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // ── User Profile ──────────────────────────────────────────────────────────
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    userProfiles.add(caller, profile);
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  func getMap(caller : Principal) : Map.Map<Nat, Expense> {
    switch (userExpenses_v2.get(caller)) {
      case (null) {
        let m = Map.empty<Nat, Expense>();
        userExpenses_v2.add(caller, m);
        m;
      };
      case (?m) { m };
    };
  };

  // ── CRUD ──────────────────────────────────────────────────────────────────
  public shared ({ caller }) func addExpense(expense : Expense) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    let id = nextExpenseId;
    nextExpenseId += 1;
    getMap(caller).add(id, { expense with id });
    id;
  };

  public shared ({ caller }) func updateExpense(expense : Expense) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    let m = getMap(caller);
    switch (m.get(expense.id)) {
      case (null) { Runtime.trap("Expense not found") };
      case (?_)   { m.add(expense.id, expense) };
    };
  };

  public shared ({ caller }) func deleteExpense(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    let m = getMap(caller);
    if (not m.containsKey(id)) { Runtime.trap("Expense not found") };
    m.remove(id);
  };

  public query ({ caller }) func getExpenses() : async ?[Expense] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    switch (userExpenses_v2.get(caller)) {
      case (null) { null };
      case (?m)   { ?m.values().toArray().sort() };
    };
  };

  public query ({ caller }) func getExpenseById(id : Nat) : async ?Expense {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    switch (userExpenses_v2.get(caller)) {
      case (null) { null };
      case (?m)   { m.get(id) };
    };
  };

  public query ({ caller }) func getExpensesByCategory(category : Category) : async [Expense] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    switch (userExpenses_v2.get(caller)) {
      case (null) { [] };
      case (?m)   { m.values().toArray().filter(func(e) { e.category == category }) };
    };
  };

  public query ({ caller }) func getExpensesByAmountRange(min : Float, max : Float) : async [Expense] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    switch (userExpenses_v2.get(caller)) {
      case (null) { [] };
      case (?m)   {
        m.values().toArray().filter(func(e) { e.amount >= min and e.amount <= max });
      };
    };
  };

  // ── Summaries ──────────────────────────────────────────────────────────────
  type CategorySummary = { category : Category; total : Float };

  type SpendingSummary = {
    total : Float;
    food : Float; transport : Float; housing : Float;
    entertainment : Float; health : Float; shopping : Float; other : Float;
    apnaMart : Float; jioMart : Float; flipkartMinutes : Float; amazon : Float;
  };

  public query ({ caller }) func getSpendingSummary() : async SpendingSummary {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    var total = 0.0; var food = 0.0; var transport = 0.0;
    var housing = 0.0; var entertainment = 0.0; var health = 0.0;
    var shopping = 0.0; var other = 0.0;
    var apnaMart = 0.0; var jioMart = 0.0;
    var flipkartMinutes = 0.0; var amazon = 0.0;
    switch (userExpenses_v2.get(caller)) {
      case (null) {};
      case (?m) {
        m.values().forEach(func(e) {
          total += e.amount;
          switch (e.category) {
            case (#food)            { food            += e.amount };
            case (#transport)       { transport       += e.amount };
            case (#housing)         { housing         += e.amount };
            case (#entertainment)   { entertainment   += e.amount };
            case (#health)          { health          += e.amount };
            case (#shopping)        { shopping        += e.amount };
            case (#other)           { other           += e.amount };
            case (#apnaMart)        { apnaMart        += e.amount };
            case (#jioMart)         { jioMart         += e.amount };
            case (#flipkartMinutes) { flipkartMinutes += e.amount };
            case (#amazon)          { amazon          += e.amount };
          };
        });
      };
    };
    { total; food; transport; housing; entertainment; health; shopping; other;
      apnaMart; jioMart; flipkartMinutes; amazon };
  };

  public query ({ caller }) func getExpensesSortedByAmount() : async [Expense] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    switch (userExpenses_v2.get(caller)) {
      case (null) { [] };
      case (?m)   { m.values().toArray().sort(Expense.compareByAmount) };
    };
  };

  public query ({ caller }) func getExpensesSortedByCategory() : async [Expense] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    switch (userExpenses_v2.get(caller)) {
      case (null) { [] };
      case (?m)   { m.values().toArray().sort(Expense.compareByCategory) };
    };
  };

  public query ({ caller }) func getExpensesByCategorySummary() : async [CategorySummary] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    let totals = Map.empty<Category, Float>();
    switch (userExpenses_v2.get(caller)) {
      case (null) { return [] };
      case (?m) {
        m.values().forEach(func(e) {
          let cur = switch (totals.get(e.category)) {
            case (null) 0.0;
            case (?t)   t;
          };
          totals.add(e.category, cur + e.amount);
        });
      };
    };
    totals.entries()
      .map(func((cat, tot)) { { category = cat; total = tot } })
      .toArray()
      .sort(func(a, b) { Category.compare(a.category, b.category) });
  };
};
