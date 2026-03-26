import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Category, type Expense } from "../backend.d";
import { useActor } from "./useActor";

export function useGetExpenses() {
  const { actor, isFetching } = useActor();
  return useQuery<Expense[]>({
    queryKey: ["expenses"],
    queryFn: async () => {
      if (!actor) return [];
      const result = await actor.getExpenses();
      return result ?? [];
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetSpendingSummary() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["spendingSummary"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getSpendingSummary();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddExpense() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (expense: Expense) => {
      if (!actor) throw new Error("No actor");
      return actor.addExpense(expense);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["spendingSummary"] });
    },
  });
}

export function useUpdateExpense() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (expense: Expense) => {
      if (!actor) throw new Error("No actor");
      return actor.updateExpense(expense);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["spendingSummary"] });
    },
  });
}

export function useDeleteExpense() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("No actor");
      return actor.deleteExpense(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["spendingSummary"] });
    },
  });
}

export { Category };
