import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Expense {
    id: bigint;
    title: string;
    date: string;
    notes?: string;
    category: Category;
    amount: number;
}
export interface SpendingSummary {
    total: number;
    other: number;
    entertainment: number;
    food: number;
    transport: number;
    shopping: number;
    housing: number;
    health: number;
    apnaMart: number;
    jioMart: number;
    flipkartMinutes: number;
    amazon: number;
}
export interface UserProfile {
    name: string;
}
export interface CategorySummary {
    total: number;
    category: Category;
}
export enum Category {
    other = "other",
    entertainment = "entertainment",
    food = "food",
    transport = "transport",
    shopping = "shopping",
    housing = "housing",
    health = "health",
    apnaMart = "apnaMart",
    jioMart = "jioMart",
    flipkartMinutes = "flipkartMinutes",
    amazon = "amazon"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addExpense(expense: Expense): Promise<bigint>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    deleteExpense(id: bigint): Promise<void>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getExpenseById(id: bigint): Promise<Expense | null>;
    getExpenses(): Promise<Array<Expense> | null>;
    getExpensesByAmountRange(minAmount: number, maxAmount: number): Promise<Array<Expense>>;
    getExpensesByCategory(category: Category): Promise<Array<Expense>>;
    getExpensesByCategorySummary(): Promise<Array<CategorySummary>>;
    getExpensesSortedByAmount(): Promise<Array<Expense>>;
    getExpensesSortedByCategory(): Promise<Array<Expense>>;
    getSpendingSummary(): Promise<SpendingSummary>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    updateExpense(expense: Expense): Promise<void>;
}
