// Quick test to verify the splitting logic works

const testContent = `
Business Plan for TechStartup Inc.

Executive Summary
TechStartup Inc. is a revolutionary software company focused on developing cutting-edge artificial intelligence solutions for small and medium-sized businesses. Our mission is to democratize AI technology and make it accessible to companies of all sizes. We believe that every business should have access to powerful AI tools without needing a large IT department or substantial capital investment.

Our flagship product, SmartAssist AI, is an intelligent business automation platform that helps companies streamline their operations, reduce costs, and improve customer satisfaction. The platform uses advanced machine learning algorithms to analyze business processes and suggest optimizations that can save time and money.

The market opportunity is substantial. According to recent market research, the global AI software market is expected to reach $500 billion by 2028, growing at a compound annual growth rate of 42%. Small and medium-sized businesses represent a largely untapped segment of this market, with over 30 million potential customers in North America alone.

Our team consists of experienced entrepreneurs and AI researchers from leading technology companies. We have already secured $2 million in seed funding and have signed contracts with 50 pilot customers who are seeing impressive results. Early adopters report an average of 30% reduction in operational costs and a 25% improvement in customer satisfaction scores.

Company Overview
TechStartup Inc. was founded in 2024 by a team of AI experts and business professionals who recognized a gap in the market for affordable, user-friendly AI solutions. Our headquarters is located in San Francisco, California, with additional development offices in Austin, Texas and Toronto, Canada.

The company operates on a subscription-based business model, offering three tiers of service to accommodate businesses of different sizes and needs. Our Basic plan starts at $99 per month and includes core automation features. The Professional plan, priced at $299 per month, adds advanced analytics and custom integrations. The Enterprise plan offers unlimited customization and dedicated support for $999 per month.

We have assembled a world-class team of 25 employees, including 15 software engineers, 5 sales and marketing professionals, and 5 administrative staff. Our technical team includes PhDs in machine learning from Stanford and MIT, as well as senior engineers from companies like Google, Facebook, and Amazon.

Market Analysis
The artificial intelligence market is experiencing explosive growth as businesses increasingly recognize the value of automation and data-driven decision making. However, most AI solutions are designed for large enterprises with substantial technology budgets. This creates a significant opportunity for companies like TechStartup Inc. that focus on the needs of smaller businesses.

Our target market consists of businesses with 10 to 500 employees across various industries including retail, healthcare, professional services, and manufacturing. These businesses typically struggle with limited IT resources and are looking for solutions that are easy to implement and maintain. They need AI tools that can deliver measurable results without requiring extensive technical expertise.

Competitive analysis shows that while there are several players in the AI automation space, most are focused on either very large enterprises or very specific use cases. Our main competitors include UiPath, Automation Anywhere, and Blue Prism, all of which target enterprise customers with complex, expensive solutions. We differentiate ourselves by offering a more accessible product at a lower price point with faster time to value.

Customer research indicates strong demand for our solution. In surveys of 500 small business owners, 78% expressed interest in AI automation tools, but only 12% currently use such solutions. The primary barriers to adoption are cost, complexity, and lack of technical expertise. Our product directly addresses all three of these concerns.

Product Description
SmartAssist AI is a comprehensive business automation platform that combines multiple AI technologies to help businesses work more efficiently. The platform consists of three main modules: Process Automation, Customer Intelligence, and Predictive Analytics.

The Process Automation module uses robotic process automation (RPA) and natural language processing to automate repetitive business tasks. It can handle activities like data entry, invoice processing, email management, and report generation. The system learns from user behavior and can suggest new automation opportunities over time.

The Customer Intelligence module analyzes customer interactions across multiple channels to provide insights into customer behavior, preferences, and sentiment. It can identify at-risk customers, predict churn, and recommend personalized engagement strategies. This helps businesses improve customer retention and increase lifetime value.

The Predictive Analytics module uses machine learning to forecast business trends and outcomes. It can predict sales, identify inventory needs, forecast cash flow, and detect anomalies that might indicate problems or opportunities. The system provides actionable recommendations based on these predictions.

All three modules are integrated into a single, user-friendly interface that requires no coding or technical expertise. The platform includes pre-built templates for common business processes and can be customized to meet specific needs. It integrates with popular business software including Salesforce, QuickBooks, Microsoft Office, and Google Workspace.

Marketing Strategy
Our go-to-market strategy focuses on three main channels: digital marketing, strategic partnerships, and direct sales. We are investing heavily in content marketing and SEO to build thought leadership and generate inbound leads. Our blog and resource center provide valuable information about AI and business automation, establishing us as trusted experts in the field.

We are developing strategic partnerships with business consultants, accounting firms, and technology integrators who work with small and medium-sized businesses. These partners can recommend our solution to their clients and help with implementation. We offer attractive referral fees and revenue sharing arrangements to incentivize partners.

Our direct sales team focuses on high-value prospects and enterprise customers. We use a consultative selling approach, starting with a free assessment of the customer's business processes to identify automation opportunities. This helps us demonstrate value before asking for a commitment.

We also participate in industry conferences and trade shows to raise awareness and generate leads. Our booth demonstrations allow prospects to see the platform in action and experience its ease of use firsthand. We sponsor relevant industry events and speak at conferences to build credibility.

Financial Projections
We project revenue of $5 million in Year 1, $15 million in Year 2, and $40 million in Year 3. These projections are based on conservative assumptions about customer acquisition and retention. We expect to acquire 400 customers in Year 1, 1,200 in Year 2, and 3,000 in Year 3.

Our cost structure is primarily driven by technology infrastructure, sales and marketing, and personnel. We expect gross margins of approximately 75% once we reach scale. Operating expenses in Year 1 will be approximately $6 million, resulting in a net loss of $1 million. We expect to reach profitability in Year 3.

We are seeking $5 million in Series A funding to accelerate growth and expand our team. The funds will be used primarily for sales and marketing (50%), product development (30%), and general operations (20%). This investment will allow us to scale our customer base and establish market leadership before larger competitors enter the space.

Our capital efficiency metrics are strong. Customer acquisition cost is approximately $1,500, and lifetime value is projected at $12,000, giving us a healthy 8:1 LTV:CAC ratio. Payback period is approximately 12 months, which is excellent for a SaaS business.

Team and Management
Our leadership team brings together deep expertise in artificial intelligence, business operations, and entrepreneurship. CEO Jane Smith previously founded and sold a successful marketing automation company and has 15 years of experience in B2B software. CTO Michael Chen holds a PhD in machine learning from Stanford and worked on AI projects at Google for 8 years.

The board of advisors includes prominent figures from the AI and business communities. We have advisors who are professors at leading universities, former executives from Fortune 500 companies, and successful entrepreneurs who have built and exited multiple startups.

We are committed to building a diverse and inclusive team. Currently, 40% of our employees are women and 35% come from underrepresented minorities. We offer competitive salaries, equity compensation, and comprehensive benefits to attract and retain top talent.
`.trim();

console.log('Test Content Length:', testContent.length, 'characters');
console.log('Word Count:', testContent.split(/\s+/).length, 'words');
console.log('\nExpected: Multiple pages (should split around 600 words per page)');
console.log('Total words should create approximately', Math.ceil(testContent.split(/\s+/).length / 600), 'pages');
