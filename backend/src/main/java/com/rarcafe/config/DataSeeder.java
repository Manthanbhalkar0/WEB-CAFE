package com.rarcafe.config;

import com.rarcafe.model.MenuItem;
import com.rarcafe.repository.MenuItemRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements CommandLineRunner {

    private final MenuItemRepository menuItemRepository;

    public DataSeeder(MenuItemRepository menuItemRepository) {
        this.menuItemRepository = menuItemRepository;
    }

    @Override
    public void run(String... args) {
        if (menuItemRepository.count() > 0) return;

        menuItemRepository.saveAll(java.util.List.of(
            new MenuItem("Brewed With Love", "Kopargaon Cold Brew", "18-hour steeped, served over ice", 140.0),
            new MenuItem("Brewed With Love", "Classic Cappuccino", "Double shot, hand-frothed milk", 130.0),
            new MenuItem("Brewed With Love", "Hazelnut Latte", "Espresso, steamed milk, roasted hazelnut", 160.0),
            new MenuItem("Brewed With Love", "Filter Kaapi", "South-Indian style, brass tumbler", 90.0),

            new MenuItem("Tea Leaves & Time", "Masala Chai", "Slow-simmered, hand-ground spices", 70.0),
            new MenuItem("Tea Leaves & Time", "Chamomile Bloom", "Whole flower infusion, honey on the side", 110.0),
            new MenuItem("Tea Leaves & Time", "Earl Grey Reader's Blend", "Bergamot, served with shortbread", 120.0),

            new MenuItem("Between The Pages", "Cheese Chilli Toast", "Grilled sourdough, jalapeño, cheddar", 150.0),
            new MenuItem("Between The Pages", "Peri Peri Fries", "Crisp fries, house peri seasoning", 120.0),
            new MenuItem("Between The Pages", "Veg Club Sandwich", "Triple-layered, herbed mayo", 170.0),
            new MenuItem("Between The Pages", "Paneer Tikki Wrap", "Grilled paneer, mint chutney, rolled fresh", 160.0),

            new MenuItem("Chapter Endings", "Molten Chocolate Cake", "Warm centre, vanilla bean scoop", 180.0),
            new MenuItem("Chapter Endings", "Biscoff Cheesecake", "No-bake, biscoff crumble top", 190.0),
            new MenuItem("Chapter Endings", "Classic Tiramisu", "Espresso-soaked, cocoa dusted", 200.0),

            new MenuItem("Reader's Specials", "The Bookworm's Mocha", "Signature — dark chocolate, espresso, sea salt", 175.0),
            new MenuItem("Reader's Specials", "Page-Turner Affogato", "Signature — vanilla gelato drowned in espresso", 165.0)
        ));

        System.out.println("Seeded Read & Roast menu with " + menuItemRepository.count() + " items.");
    }
}
