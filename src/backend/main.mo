import Float "mo:core/Float";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Array "mo:core/Array";
import Runtime "mo:core/Runtime";
import Iter "mo:core/Iter";
import Text "mo:core/Text";
import Order "mo:core/Order";

import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  // Expense Types
  type Category = {
    #food;
    #transport;
    #housing;
    #entertainment;
    #health;
    #shopping;
    #other;
  };

  module Category {
    public func compare(category1 : Category, category2 : Category) : Order.Order {
      switch (category1, category2) {
        case (#food, #food) { #equal };
        case (#food, _) { #less };
        case (_, #food) { #greater };

        case (#transport, #transport) { #equal };
        case (#transport, _) { #less };
        case (_, #transport) { #greater };

        case (#housing, #housing) { #equal };
        case (#housing, _) { #less };
        case (_, #housing) { #greater };

        case (#entertainment, #entertainment) { #equal };
        case (#entertainment, _) { #less };
        case (_, #entertainment) { #greater };

        case (#health, #health) { #equal };
        case (#health, _) { #less };
        case (_, #health) { #greater };

        case (#shopping, #shopping) { #equal };
        case (#shopping, _) { #less };
        case (_, #shopping) { #greater };

        case (#other, #other) { #equal };
      };
    };
  };

  type Expense = {
    id : Nat;
    title : Text;
    amount : Float;
    category : Category;
    date : Text;
    notes : ?Text;
  };

  module Expense {
    public func compare(expense1 : Expense, expense2 : Expense) : Order.Order {
      Nat.compare(expense1.id, expense2.id);
    };

    public func compareByAmount(expense1 : Expense, expense2 : Expense) : Order.Order {
      Float.compare(expense1.amount, expense2.amount);
    };

    public func compareByCategory(expense1 : Expense, expense2 : Expense) : Order.Order {
      Category.compare(expense1.category, expense2.category);
    };
  };

  // User Profile Type
  public type UserProfile = {
    name : Text;
  };

  // User Expense Store
  let userExpenses = Map.empty<Principal, Map.Map<Nat, Expense>>();
  let userProfiles = Map.empty<Principal, UserProfile>();
  var nextExpenseId = 0;

  // Authorization - include only into actor, not into unit test actors
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // User Profile Functions
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Helper function to get user expenses (returns empty map if none exist)
  func getUserExpensesMap(caller : Principal) : Map.Map<Nat, Expense> {
    switch (userExpenses.get(caller)) {
      case (null) {
        let newMap = Map.empty<Nat, Expense>();
        userExpenses.add(caller, newMap);
        newMap;
      };
      case (?expenses) { expenses };
    };
  };

  // Add Expense
  public shared ({ caller }) func addExpense(expense : Expense) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add expenses");
    };
    let newId = nextExpenseId;
    nextExpenseId += 1;

    let newExpense : Expense = {
      expense with id = newId;
    };

    let expenses = getUserExpensesMap(caller);
    expenses.add(newId, newExpense);
    newId;
  };

  // Update Expense
  public shared ({ caller }) func updateExpense(expense : Expense) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update expenses");
    };

    let expenses = getUserExpensesMap(caller);
    switch (expenses.get(expense.id)) {
      case (null) {
        Runtime.trap("Expense not found");
      };
      case (?_) {
        expenses.add(expense.id, expense);
      };
    };
  };

  // Delete Expense
  public shared ({ caller }) func deleteExpense(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete expenses");
    };

    let expenses = getUserExpensesMap(caller);
    if (not expenses.containsKey(id)) {
      Runtime.trap("Expense not found");
    };
    expenses.remove(id);
  };

  // Get All Expenses
  public query ({ caller }) func getExpenses() : async ?[Expense] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view expenses");
    };
    switch (userExpenses.get(caller)) {
      case (null) { null };
      case (?expenses) { ?expenses.values().toArray().sort() };
    };
  };

  // Get Expense By ID
  public query ({ caller }) func getExpenseById(id : Nat) : async ?Expense {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view expenses");
    };

    switch (userExpenses.get(caller)) {
      case (null) { null };
      case (?expenses) { expenses.get(id) };
    };
  };

  // Get Expenses By Category
  public query ({ caller }) func getExpensesByCategory(category : Category) : async [Expense] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view expenses");
    };

    switch (userExpenses.get(caller)) {
      case (null) { [] };
      case (?expenses) {
        expenses.values().toArray().filter(func(expense) { expense.category == category });
      };
    };
  };

  // Get Expenses By Amount Range
  public query ({ caller }) func getExpensesByAmountRange(minAmount : Float, maxAmount : Float) : async [Expense] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view expenses");
    };

    switch (userExpenses.get(caller)) {
      case (null) { [] };
      case (?expenses) {
        expenses.values().toArray().filter(
          func(expense) {
            expense.amount >= minAmount and expense.amount <= maxAmount;
          }
        );
      };
    };
  };

  // Core Function - Get Spending Summary
  type CategorySummary = {
    category : Category;
    total : Float;
  };

  type SpendingSummary = {
    total : Float;
    food : Float;
    transport : Float;
    housing : Float;
    entertainment : Float;
    health : Float;
    shopping : Float;
    other : Float;
  };

  public query ({ caller }) func getSpendingSummary() : async SpendingSummary {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view spending summary");
    };
    var total = 0.0;
    var food = 0.0;
    var transport = 0.0;
    var housing = 0.0;
    var entertainment = 0.0;
    var health = 0.0;
    var shopping = 0.0;
    var other = 0.0;

    switch (userExpenses.get(caller)) {
      case (null) {};
      case (?expenses) {
        expenses.values().forEach(
          func(expense) {
            total += expense.amount;
            switch (expense.category) {
              case (#food) { food += expense.amount };
              case (#transport) { transport += expense.amount };
              case (#housing) { housing += expense.amount };
              case (#entertainment) { entertainment += expense.amount };
              case (#health) { health += expense.amount };
              case (#shopping) { shopping += expense.amount };
              case (#other) { other += expense.amount };
            };
          }
        );
      };
    };

    {
      total;
      food;
      transport;
      housing;
      entertainment;
      health;
      shopping;
      other;
    };
  };

  // Advanced Queries - Get Expenses By Amount
  public query ({ caller }) func getExpensesSortedByAmount() : async [Expense] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view expenses");
    };

    switch (userExpenses.get(caller)) {
      case (null) { [] };
      case (?expenses) { expenses.values().toArray().sort(Expense.compareByAmount) };
    };
  };

  // Advanced Queries - Get Expenses By Category Sorted
  public query ({ caller }) func getExpensesSortedByCategory() : async [Expense] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view expenses");
    };

    switch (userExpenses.get(caller)) {
      case (null) { [] };
      case (?expenses) { expenses.values().toArray().sort(Expense.compareByCategory) };
    };
  };

  // Helper Functions
  public query ({ caller }) func getExpensesByCategorySummary() : async [CategorySummary] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view expenses");
    };
    let categoryTotals = Map.empty<Category, Float>();

    switch (userExpenses.get(caller)) {
      case (null) { return [] };
      case (?expenses) {
        expenses.values().forEach(
          func(expense) {
            let currentTotal = switch (categoryTotals.get(expense.category)) {
              case (null) { 0.0 };
              case (?total) { total };
            };
            categoryTotals.add(expense.category, currentTotal + expense.amount);
          }
        );
      };
    };

    // Convert category totals map to array
    categoryTotals.entries().map(
      func((category, total)) {
        {
          category;
          total;
        };
      }
    ).toArray().sort(func(summary1, summary2) { Category.compare(summary1.category, summary2.category) });
  };
};
