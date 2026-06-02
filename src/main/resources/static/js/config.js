// ═══════════════════════════════════════════════════════════════════════
// Auth0 config
// ═══════════════════════════════════════════════════════════════════════
const AUTH0_DOMAIN    = 'dipti-test.us.auth0.com';
const AUTH0_CLIENT_ID = 'HXLH9MPOOJ34kt8WzmCqnqLYwRnfstfm';
const AUTH0_AUDIENCE  = 'https://pizza42';

// ═══════════════════════════════════════════════════════════════════════
// Menu data
// ═══════════════════════════════════════════════════════════════════════
const MENU = [
  { id:1, name:'Margherita',    price:12.99, desc:'Fresh mozzarella, tomato sauce, basil, and olive oil.', img:'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&auto=format&q=80' },
  { id:2, name:'Pepperoni',     price:14.99, desc:'Crispy pepperoni, melted cheese, and garlic-seasoned crust.', img:'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=600&auto=format&q=80' },
  { id:3, name:'BBQ Chicken',   price:15.99, desc:'Smoky BBQ sauce, grilled chicken, and caramelised onions.', img:'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&auto=format&q=80' },
  { id:4, name:'Veggie Supreme',price:13.99, desc:'Bell peppers, onions, mushrooms, and black olives.', img:'https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?w=600&auto=format&q=80' },
  { id:5, name:'Four Cheese',   price:16.99, desc:'Mozzarella, gouda, parmesan, and creamy ricotta.', img:'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&q=80' },
  { id:6, name:'Spicy Indian',  price:15.49, desc:'Salami piccante, nduja, and chilli oil drizzle.', img:'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=600&auto=format&q=80' },
  // Loyalty reward — not shown in the menu grid, only claimable via the loyalty banner
  { id:99, name:'Garlic Bread', price:0, loyalty:true, desc:'Crispy garlic bread — your loyalty reward.', img:'https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?w=600&auto=format&q=80' },
];

const TOPPINGS = ['Extra Cheese', 'Mushrooms', 'Jalapeños', 'Black Olives', 'Onions', 'Bacon'];
