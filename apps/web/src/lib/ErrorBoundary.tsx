import React from "react";
import { apiErrorMessage } from "./api";
import { Button, Card } from "./ui";

type ErrorBoundaryProps = {
  title?: string;
  children: React.ReactNode;
  fallbackClassName?: string;
};

type ErrorBoundaryState = {
  error: Error | null;
};

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("UI crashed inside error boundary", error);
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <Card className={this.props.fallbackClassName ?? "grid gap-3 p-4"}>
          <div>
            <h2 className="text-lg font-black text-red-700">{this.props.title ?? "This window crashed"}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">{apiErrorMessage(this.state.error, "An unexpected UI error occurred.")}</p>
          </div>
          <Button className="justify-self-start" onClick={this.reset}>Reload window</Button>
        </Card>
      );
    }

    return this.props.children;
  }
}
