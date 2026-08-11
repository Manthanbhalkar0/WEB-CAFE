package com.rarcafe.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public class OrderRequest {

    private String customerName;
    private String customerPhone;

    @NotEmpty(message = "Order must contain at least one item")
    @Valid
    private List<Item> items;

    public static class Item {
        @NotNull
        private Long menuItemId;
        @NotNull
        private Integer quantity;

        public Long getMenuItemId() { return menuItemId; }
        public void setMenuItemId(Long menuItemId) { this.menuItemId = menuItemId; }
        public Integer getQuantity() { return quantity; }
        public void setQuantity(Integer quantity) { this.quantity = quantity; }
    }

    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }

    public String getCustomerPhone() { return customerPhone; }
    public void setCustomerPhone(String customerPhone) { this.customerPhone = customerPhone; }

    public List<Item> getItems() { return items; }
    public void setItems(List<Item> items) { this.items = items; }
}
