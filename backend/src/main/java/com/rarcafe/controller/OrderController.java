package com.rarcafe.controller;

import com.rarcafe.dto.OrderRequest;
import com.rarcafe.model.MenuItem;
import com.rarcafe.model.Order;
import com.rarcafe.model.OrderItem;
import com.rarcafe.repository.MenuItemRepository;
import com.rarcafe.repository.OrderRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Random;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderRepository orderRepository;
    private final MenuItemRepository menuItemRepository;
    private final Random random = new Random();

    public OrderController(OrderRepository orderRepository, MenuItemRepository menuItemRepository) {
        this.orderRepository = orderRepository;
        this.menuItemRepository = menuItemRepository;
    }

    @GetMapping
    public List<Order> getAllOrders() {
        return orderRepository.findAll();
    }

    @GetMapping("/{orderNumber}")
    public ResponseEntity<Order> getByOrderNumber(@PathVariable String orderNumber) {
        return orderRepository.findByOrderNumber(orderNumber)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> placeOrder(@Valid @RequestBody OrderRequest request) {
        Order order = new Order();
        order.setCustomerName(
                (request.getCustomerName() == null || request.getCustomerName().isBlank())
                        ? "Guest Reader" : request.getCustomerName());
        order.setCustomerPhone(request.getCustomerPhone());
        order.setOrderNumber(generateOrderNumber());

        double total = 0.0;
        for (OrderRequest.Item reqItem : request.getItems()) {
            MenuItem menuItem = menuItemRepository.findById(reqItem.getMenuItemId())
                    .orElseThrow(() -> new RuntimeException("Menu item not found: " + reqItem.getMenuItemId()));
            OrderItem orderItem = new OrderItem(
                    menuItem.getId(), menuItem.getName(), menuItem.getPrice(), reqItem.getQuantity());
            order.addItem(orderItem);
            total += menuItem.getPrice() * reqItem.getQuantity();
        }
        order.setTotalAmount(total);
        order.setStatus(Order.OrderStatus.PLACED);

        Order saved = orderRepository.save(order);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<Order> updateStatus(@PathVariable Long id, @RequestParam Order.OrderStatus status) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found: " + id));
        order.setStatus(status);
        return ResponseEntity.ok(orderRepository.save(order));
    }

    private String generateOrderNumber() {
        return "RAR-" + (1000 + random.nextInt(9000));
    }
}
