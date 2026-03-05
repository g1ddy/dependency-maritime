import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { Header } from "./Header";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";

describe("Header", () => {
  const onOpenDataSourceMock = vi.fn();
  const onOpenSettingsMock = vi.fn();

  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    render(
      <TooltipProvider>
        <MemoryRouter>
          <Header
            onOpenDataSource={onOpenDataSourceMock}
            onOpenSettings={onOpenSettingsMock}
          />
        </MemoryRouter>
      </TooltipProvider>,
    );
  };

  it("renders without crashing", () => {
    renderComponent();
    expect(screen.getByText("Dependency Graph")).toBeDefined();
    expect(screen.getByText("Relationships")).toBeDefined();
  });

  it("calls onOpenDataSource when upload button is clicked", () => {
    renderComponent();
    const uploadButton = screen.getByLabelText("Upload/Select Data Source");
    fireEvent.click(uploadButton);
    expect(onOpenDataSourceMock).toHaveBeenCalled();
  });

  it("has accessible buttons", () => {
    renderComponent();
    expect(screen.getByLabelText("Open Menu")).toBeDefined();
    expect(screen.getByLabelText("Dependency Graph")).toBeDefined();
    expect(screen.getByLabelText("Relationships")).toBeDefined();
    expect(screen.getByLabelText("Upload/Select Data Source")).toBeDefined();
  });
});
