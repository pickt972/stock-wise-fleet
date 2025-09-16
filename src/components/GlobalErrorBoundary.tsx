import React from "react";
import { Button } from "@/components/ui/button";

interface GlobalErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class GlobalErrorBoundary extends React.Component<React.PropsWithChildren, GlobalErrorBoundaryState> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): GlobalErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log de diagnostic minimal
    console.error("GlobalErrorBoundary caught: ", error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: undefined });
    // Recharge douce de la route
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-lg border bg-background text-foreground shadow-lg p-6 space-y-4">
            <div>
              <h1 className="text-xl font-semibold">Une erreur est survenue</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Désolé, une erreur inattendue s'est produite. Vous pouvez recharger la page et réessayer.
              </p>
            </div>
            {this.state.error?.message && (
              <pre className="text-xs bg-muted/60 p-3 rounded overflow-auto max-h-40">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex gap-2">
              <Button onClick={this.handleReload} className="flex-1">Recharger</Button>
              <Button variant="outline" className="flex-1" onClick={() => (window.location.href = "/")}>Accueil</Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;
