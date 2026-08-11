package com.rarcafe.model;

import jakarta.persistence.*;

@Entity
@Table(name = "order_items")
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "order_id")
    private Order order;

    private Long menuItemId;
    private String name;      // snapshot of name at order time
    private Double price;     // snapshot of price at order time
    private Integer quantity;

    public OrderItem() {}

    public OrderItem(Long menuItemId, String name, Double price, Integer quantity) {
        this.menuItemId = menuItemId;
        this.name = name;
        this.price = price;
        this.quantity = quantity;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Order getOrder() { return order; }
    public void setOrder(Order order) { this.order = order; }

    public Long getMenuItemId() { return menuItemId; }
    public void setMenuItemId(Long menuItemId) { this.menuItemId = menuItemId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Double getPrice() { return price; }
    public void setPrice(Double price) { this.price = price; }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }
}
