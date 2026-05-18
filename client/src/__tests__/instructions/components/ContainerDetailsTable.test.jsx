/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ContainerDetailsTable } from "../../../components/instructions/ContainerDetailsTable";

const CONTAINERS = [
  {
    id: 1,
    containerType: "6m",
    containerNum: "ABCD1234567",
    fileRef: "FR001",
    weight: "5000",
    cargoDescription: "Electronics",
    hazardous: false,
    addSurcharges: false,
    vgm: false,
  },
  {
    id: 2,
    containerType: "12m",
    containerNum: "WXYZ9876543",
    fileRef: "",
    weight: null,
    cargoDescription: "Machinery",
    hazardous: true,
    addSurcharges: true,
    vgm: true,
  },
];

const defaultProps = {
  containers: CONTAINERS,
  containerFieldErrors: {},
  shipmentTypeId: "1", // Import
  isImport: true,
  isReadOnly: false,
  onContainerChange: jest.fn(),
  onDeleteContainer: jest.fn(),
};

beforeEach(() => jest.clearAllMocks());

describe("ContainerDetailsTable — rendering", () => {
  it("renders Container Details heading", () => {
    render(<ContainerDetailsTable {...defaultProps} />);
    expect(screen.getByText("Container Details")).toBeInTheDocument();
  });

  it("renders column headers", () => {
    render(<ContainerDetailsTable {...defaultProps} />);
    expect(screen.getByText("Container Type")).toBeInTheDocument();
    expect(screen.getByText("Container Number")).toBeInTheDocument();
    expect(screen.getByText("Cargo Description")).toBeInTheDocument();
    expect(screen.getByText("Hazardous")).toBeInTheDocument();
    expect(screen.getByText("Add Surcharges")).toBeInTheDocument();
    expect(screen.getByText("VGM")).toBeInTheDocument();
  });

  it("renders container type labels", () => {
    render(<ContainerDetailsTable {...defaultProps} />);
    expect(screen.getByText("6m")).toBeInTheDocument();
    expect(screen.getByText("12m")).toBeInTheDocument();
  });

  it("renders container number values", () => {
    render(<ContainerDetailsTable {...defaultProps} />);
    expect(screen.getByDisplayValue("ABCD1234567")).toBeInTheDocument();
    expect(screen.getByDisplayValue("WXYZ9876543")).toBeInTheDocument();
  });

  it("renders cargo descriptions", () => {
    render(<ContainerDetailsTable {...defaultProps} />);
    expect(screen.getByDisplayValue("Electronics")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Machinery")).toBeInTheDocument();
  });

  it("renders success message when provided", () => {
    render(
      <ContainerDetailsTable
        {...defaultProps}
        successMessage="Containers updated successfully"
      />
    );
    expect(
      screen.getByText("Containers updated successfully")
    ).toBeInTheDocument();
  });

  it("renders loading message when isLoading=true", () => {
    render(<ContainerDetailsTable {...defaultProps} isLoading={true} />);
    expect(screen.getByText("Updating containers...")).toBeInTheDocument();
  });
});

describe("ContainerDetailsTable — conditional columns", () => {
  it("shows Weight column for Import (shipmentTypeId=1)", () => {
    render(<ContainerDetailsTable {...defaultProps} />);
    expect(screen.getByText("Weight")).toBeInTheDocument();
  });

  it("shows Weight column for Export (shipmentTypeId=2)", () => {
    render(
      <ContainerDetailsTable
        {...defaultProps}
        shipmentTypeId="2"
        isImport={false}
      />
    );
    expect(screen.getByText("Weight")).toBeInTheDocument();
  });

  it("shows Weight column for Cross-haul (shipmentTypeId=3)", () => {
    render(
      <ContainerDetailsTable
        {...defaultProps}
        shipmentTypeId="3"
        isImport={false}
      />
    );
    expect(screen.getByText("Weight")).toBeInTheDocument();
  });

  it("shows File Reference column for Export (shipmentTypeId=2)", () => {
    render(
      <ContainerDetailsTable
        {...defaultProps}
        shipmentTypeId="2"
        isImport={false}
      />
    );
    expect(screen.getByText("File Reference")).toBeInTheDocument();
  });

  it("hides File Reference column for non-Export", () => {
    render(<ContainerDetailsTable {...defaultProps} shipmentTypeId="1" />);
    expect(screen.queryByText("File Reference")).not.toBeInTheDocument();
  });

  it("hides Weight column for Add-on (shipmentTypeId=5)", () => {
    render(
      <ContainerDetailsTable
        {...defaultProps}
        shipmentTypeId="5"
        isImport={false}
      />
    );
    expect(screen.queryByText("Weight")).not.toBeInTheDocument();
  });
});

describe("ContainerDetailsTable — checkboxes", () => {
  it("hazardous checkbox is checked for second container", () => {
    render(<ContainerDetailsTable {...defaultProps} />);
    const checkboxes = screen.getAllByRole("checkbox");
    // Row 1: hazardous=false, addSurcharges=false, vgm=false
    // Row 2: hazardous=true, addSurcharges=true, vgm=true
    expect(checkboxes[0]).not.toBeChecked(); // container 1 hazardous
    expect(checkboxes[3]).toBeChecked();     // container 2 hazardous
  });

  it("vgm checkbox is checked for second container", () => {
    render(<ContainerDetailsTable {...defaultProps} />);
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes[5]).toBeChecked(); // container 2 vgm
  });
});

describe("ContainerDetailsTable — read-only", () => {
  it("shows Delete buttons when not read-only", () => {
    render(<ContainerDetailsTable {...defaultProps} />);
    expect(screen.getAllByText("Delete")).toHaveLength(CONTAINERS.length);
  });

  it("hides Delete buttons when isReadOnly=true", () => {
    render(<ContainerDetailsTable {...defaultProps} isReadOnly={true} />);
    expect(screen.queryByText("Delete")).not.toBeInTheDocument();
  });

  it("disables text inputs when isReadOnly=true", () => {
    render(<ContainerDetailsTable {...defaultProps} isReadOnly={true} />);
    screen.getAllByRole("textbox").forEach((input) =>
      expect(input).toBeDisabled()
    );
  });
});

describe("ContainerDetailsTable — error display", () => {
  it("applies error class to container number input when error exists", () => {
    render(
      <ContainerDetailsTable
        {...defaultProps}
        containerFieldErrors={{ "container-1": "Number required" }}
      />
    );
    expect(screen.getByDisplayValue("ABCD1234567")).toHaveClass(
      "controller-instructions-error-field"
    );
  });

  it("shows container error text below the field", () => {
    render(
      <ContainerDetailsTable
        {...defaultProps}
        containerFieldErrors={{ "container-1": "Number required" }}
      />
    );
    expect(screen.getByText("Number required")).toBeInTheDocument();
  });

  it("applies error class to weight input when weight error exists", () => {
    render(
      <ContainerDetailsTable
        {...defaultProps}
        containerFieldErrors={{ "weight-1": "Invalid weight" }}
      />
    );
    const weightInput = screen.getByDisplayValue("5000");
    expect(weightInput).toHaveClass("controller-instructions-error-field");
  });
});

describe("ContainerDetailsTable — callbacks", () => {
  it("calls onContainerChange when container number changes", () => {
    const onContainerChange = jest.fn();
    render(
      <ContainerDetailsTable
        {...defaultProps}
        onContainerChange={onContainerChange}
      />
    );
    fireEvent.change(screen.getByDisplayValue("ABCD1234567"), {
      target: { value: "NEW1234567" },
    });
    expect(onContainerChange).toHaveBeenCalledWith(1, "containerNum", "NEW1234567");
  });

  it("calls onContainerChange when hazardous checkbox toggles", () => {
    const onContainerChange = jest.fn();
    render(
      <ContainerDetailsTable
        {...defaultProps}
        onContainerChange={onContainerChange}
      />
    );
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]); // container 1 hazardous (currently false)
    expect(onContainerChange).toHaveBeenCalledWith(1, "hazardous", true);
  });

  it("calls onDeleteContainer with the container when Delete is clicked", () => {
    const onDeleteContainer = jest.fn();
    render(
      <ContainerDetailsTable
        {...defaultProps}
        onDeleteContainer={onDeleteContainer}
      />
    );
    fireEvent.click(screen.getAllByText("Delete")[0]);
    expect(onDeleteContainer).toHaveBeenCalledWith(CONTAINERS[0]);
  });
});
