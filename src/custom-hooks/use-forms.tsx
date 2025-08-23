import { useState } from "react";

export interface FormState<T> {
  success: boolean;
  message?: string;
  errors?: {
    [K in keyof T]?: string[];
  };
  inputs?: Partial<T>;
}

export function useForms<T extends Record<string, any>>(
  submit: (data: T) => Promise<FormState<T> | void>
) {
  const [isLoading, setIsLoading] = useState(false);
  const [state, setState] = useState<FormState<T>>({
    success: false,
    message: undefined,
    errors: undefined,
    inputs: undefined,
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);

    try {
      const formData = new FormData(event.currentTarget);
      const data = Object.fromEntries(formData) as T;

      const newState = await submit(data);

      if (newState) {
        setState(newState);
      }
    } finally {
      setIsLoading(false);
    }
  }

  return { state, handleSubmit, isLoading };
}
