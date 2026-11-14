import { Component, type ReactNode } from "react";

/** Catches render errors (for example no WebGL) and shows a fallback instead of a blank screen. */
export class ErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { /* the fallback is enough, nothing to report */ }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
