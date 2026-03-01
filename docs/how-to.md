The server is starting. Test the flow:

Go to the shop: http://localhost:3000/en/shop
Click on a product to view details
Click "Add to Cart" - the cart drawer should open
Click "Checkout" - goes to checkout page
Enter your email and click "Pay"
Complete payment on Stripe's test page (use card 4242 4242 4242 4242, any future date, any CVC)
Get redirected to success page
For testing, use Stripe's test card numbers:

Success: 4242 4242 4242 4242
Requires auth: 4000 0025 0000 3155
Declined: 4000 0000 0000 0002
Let me know if you run into any issues during testing!